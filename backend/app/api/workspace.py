import uuid
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.workspace import Project, Sprint, Task
from app.models.goal import MacroGoal
from sqlalchemy import func

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

# Schemas

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    status: Optional[str] = "active"

class SprintCreate(BaseModel):
    project_id: uuid.UUID
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = "planned"

class TaskCreate(BaseModel):
    project_id: Optional[uuid.UUID] = None
    sprint_id: Optional[uuid.UUID] = None
    goal_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[date] = None

# Project Endpoints

@router.get("/projects", response_model=List[Project])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Project).where(Project.user_id == current_user.id).order_by(Project.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/projects", response_model=Project)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = Project(**data.dict(), user_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return {"ok": True}

# Sprint Endpoints

@router.get("/sprints", response_model=List[Sprint])
async def list_sprints(
    project_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Sprint).where(Sprint.user_id == current_user.id)
    if project_id:
        stmt = stmt.where(Sprint.project_id == project_id)
    stmt = stmt.order_by(Sprint.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/sprints", response_model=Sprint)
async def create_sprint(
    data: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project ownership
    project = await db.get(Project, data.project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    
    sprint = Sprint(**data.dict(), user_id=current_user.id)
    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)
    return sprint

@router.delete("/sprints/{sprint_id}")
async def delete_sprint(
    sprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sprint = await db.get(Sprint, sprint_id)
    if not sprint or sprint.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sprint not found")
    await db.delete(sprint)
    await db.commit()
    return {"ok": True}

# Task Endpoints

@router.get("/tasks", response_model=List[Task])
async def list_tasks(
    project_id: Optional[uuid.UUID] = None,
    sprint_id: Optional[uuid.UUID] = None,
    domain: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Task).where(Task.user_id == current_user.id)
    if project_id:
        stmt = stmt.where(Task.project_id == project_id)
    if sprint_id:
        stmt = stmt.where(Task.sprint_id == sprint_id)
    if domain:
        stmt = stmt.where(Task.domain == domain)
    stmt = stmt.order_by(Task.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

class WorkspaceStats(BaseModel):
    projects_count: int
    sprints_count: int
    tasks_count: int
    goals_count: int

@router.get("/stats", response_model=WorkspaceStats)
async def get_workspace_stats(
    domain: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Base conditions
    def apply_domain(stmt, model_class, dom_col="domain"):
        if domain:
            if dom_col == "category":
                return stmt.where(model_class.category == domain)
            return stmt.where(model_class.domain == domain)
        return stmt

    # Projects
    p_stmt = select(func.count()).select_from(Project).where(Project.user_id == current_user.id, Project.status == "active")
    p_stmt = apply_domain(p_stmt, Project)
    p_count = (await db.execute(p_stmt)).scalar() or 0

    # Sprints
    s_stmt = select(func.count()).select_from(Sprint).where(Sprint.user_id == current_user.id, Sprint.status.in_(["planned", "active"]))
    s_count = (await db.execute(s_stmt)).scalar() or 0

    # Tasks
    t_stmt = select(func.count()).select_from(Task).where(Task.user_id == current_user.id, Task.status != "done")
    t_stmt = apply_domain(t_stmt, Task)
    t_count = (await db.execute(t_stmt)).scalar() or 0

    # Goals
    g_stmt = select(func.count()).select_from(MacroGoal).where(MacroGoal.user_id == current_user.id, MacroGoal.status == "active")
    g_stmt = apply_domain(g_stmt, MacroGoal, dom_col="category")
    g_count = (await db.execute(g_stmt)).scalar() or 0

    return WorkspaceStats(
        projects_count=p_count,
        sprints_count=s_count,
        tasks_count=t_count,
        goals_count=g_count
    )

@router.post("/tasks", response_model=Task)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.project_id:
        project = await db.get(Project, data.project_id)
        if not project or project.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Project not found")
    
    task = Task(**data.dict(), user_id=current_user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

@router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: uuid.UUID,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for k, v in data.items():
        if hasattr(task, k) and k not in ["id", "user_id", "created_at"]:
            setattr(task, k, v)
            
    await db.commit()
    await db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"ok": True}
