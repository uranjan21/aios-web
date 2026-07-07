import uuid
from typing import List, Optional
from datetime import date, datetime
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

# ── Create schemas ────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    status: Optional[str] = "active"
    priority: Optional[str] = "medium"
    color: Optional[str] = None
    due_date: Optional[date] = None
    labels: Optional[str] = None

class SprintCreate(BaseModel):
    project_id: uuid.UUID
    name: str
    goals: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = "planned"
    capacity: Optional[int] = None

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
    labels: Optional[str] = None

# ── Update schemas (all fields optional) ──────────────────────────────────────

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    color: Optional[str] = None
    due_date: Optional[date] = None
    labels: Optional[str] = None

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goals: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    project_id: Optional[uuid.UUID] = None
    capacity: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    project_id: Optional[uuid.UUID] = None
    sprint_id: Optional[uuid.UUID] = None
    goal_id: Optional[uuid.UUID] = None
    labels: Optional[str] = None

# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_owned(db: AsyncSession, model, obj_id: uuid.UUID, user_id: uuid.UUID, label: str):
    obj = await db.get(model, obj_id)
    if not obj or obj.user_id != user_id:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj

def _check_goal_domain(goal: MacroGoal, domain: Optional[str]) -> None:
    """A linked goal must belong to the same domain as the project/task."""
    if goal.category != (domain or "general"):
        raise HTTPException(
            status_code=422,
            detail=f"Linked goal belongs to the '{goal.category}' domain, not '{domain or 'general'}'",
        )

def _reject_nulls(payload: dict, fields: tuple) -> None:
    """422 when a PATCH explicitly nulls a column that is NOT NULL in the DB."""
    for f in fields:
        if f in payload and payload[f] is None:
            raise HTTPException(status_code=422, detail=f"{f} cannot be null")

# ── Project endpoints ─────────────────────────────────────────────────────────

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
    if data.goal_id:
        goal = await _get_owned(db, MacroGoal, data.goal_id, current_user.id, "Goal")
        _check_goal_domain(goal, data.domain)
    project = Project(**data.model_dump(), user_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.patch("/projects/{project_id}", response_model=Project)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_owned(db, Project, project_id, current_user.id, "Project")
    payload = data.model_dump(exclude_unset=True)
    _reject_nulls(payload, ("name", "status"))

    # Validate goal↔domain consistency only when the request touches either
    # field, so unrelated PATCHes on legacy rows keep working.
    if "goal_id" in payload or "domain" in payload:
        eff_goal_id = payload.get("goal_id", project.goal_id)
        eff_domain = payload.get("domain", project.domain)
        if eff_goal_id:
            goal = await _get_owned(db, MacroGoal, eff_goal_id, current_user.id, "Goal")
            _check_goal_domain(goal, eff_domain)

    for k, v in payload.items():
        setattr(project, k, v)
    project.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_owned(db, Project, project_id, current_user.id, "Project")
    await db.delete(project)
    await db.commit()
    return {"ok": True}

# ── Sprint endpoints ──────────────────────────────────────────────────────────

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
    await _get_owned(db, Project, data.project_id, current_user.id, "Project")
    sprint = Sprint(**data.model_dump(), user_id=current_user.id)
    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)
    return sprint

@router.patch("/sprints/{sprint_id}", response_model=Sprint)
async def update_sprint(
    sprint_id: uuid.UUID,
    data: SprintUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sprint = await _get_owned(db, Sprint, sprint_id, current_user.id, "Sprint")
    payload = data.model_dump(exclude_unset=True)
    _reject_nulls(payload, ("name", "status", "project_id"))
    if payload.get("project_id"):
        await _get_owned(db, Project, payload["project_id"], current_user.id, "Project")
    for k, v in payload.items():
        setattr(sprint, k, v)
    sprint.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(sprint)
    return sprint

@router.delete("/sprints/{sprint_id}")
async def delete_sprint(
    sprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sprint = await _get_owned(db, Sprint, sprint_id, current_user.id, "Sprint")
    await db.delete(sprint)
    await db.commit()
    return {"ok": True}

# ── Task endpoints ────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=List[Task])
async def list_tasks(
    project_id: Optional[uuid.UUID] = None,
    sprint_id: Optional[uuid.UUID] = None,
    domain: Optional[str] = None,
    goal_id: Optional[uuid.UUID] = None,
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
    if goal_id:
        stmt = stmt.where(Task.goal_id == goal_id)
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
    p_stmt = select(func.count()).select_from(Project).where(
        Project.user_id == current_user.id, Project.status == "active"
    )
    if domain:
        p_stmt = p_stmt.where(Project.domain == domain)
    p_count = (await db.execute(p_stmt)).scalar() or 0

    # Sprints have no domain column — derive it from the parent project.
    s_stmt = select(func.count()).select_from(Sprint).where(
        Sprint.user_id == current_user.id, Sprint.status.in_(["planned", "active"])
    )
    if domain:
        s_stmt = s_stmt.join(Project, Sprint.project_id == Project.id).where(Project.domain == domain)
    s_count = (await db.execute(s_stmt)).scalar() or 0

    t_stmt = select(func.count()).select_from(Task).where(
        Task.user_id == current_user.id, Task.status != "done"
    )
    if domain:
        t_stmt = t_stmt.where(Task.domain == domain)
    t_count = (await db.execute(t_stmt)).scalar() or 0

    g_stmt = select(func.count()).select_from(MacroGoal).where(
        MacroGoal.user_id == current_user.id, MacroGoal.status == "active"
    )
    if domain:
        g_stmt = g_stmt.where(MacroGoal.category == domain)
    g_count = (await db.execute(g_stmt)).scalar() or 0

    return WorkspaceStats(projects_count=p_count, sprints_count=s_count, tasks_count=t_count, goals_count=g_count)

@router.post("/tasks", response_model=Task)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payload = data.model_dump()

    project = None
    if payload["project_id"]:
        project = await _get_owned(db, Project, payload["project_id"], current_user.id, "Project")

    if payload["sprint_id"]:
        sprint = await _get_owned(db, Sprint, payload["sprint_id"], current_user.id, "Sprint")
        if payload["project_id"] and sprint.project_id != payload["project_id"]:
            raise HTTPException(status_code=422, detail="Sprint belongs to a different project")
        if not payload["project_id"]:
            # A sprint task always belongs to the sprint's project.
            payload["project_id"] = sprint.project_id
            project = await db.get(Project, sprint.project_id)

    if project and project.domain:
        if payload["domain"] is None:
            payload["domain"] = project.domain
        elif (payload["domain"] or "general") != (project.domain or "general"):
            raise HTTPException(status_code=422, detail="Task domain must match its project's domain")

    if payload["goal_id"]:
        goal = await _get_owned(db, MacroGoal, payload["goal_id"], current_user.id, "Goal")
        _check_goal_domain(goal, payload["domain"])

    task = Task(**payload, user_id=current_user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

@router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: uuid.UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await _get_owned(db, Task, task_id, current_user.id, "Task")
    payload = data.model_dump(exclude_unset=True)
    _reject_nulls(payload, ("title", "status", "priority"))

    if payload.get("project_id"):
        await _get_owned(db, Project, payload["project_id"], current_user.id, "Project")

    if payload.get("sprint_id"):
        sprint = await _get_owned(db, Sprint, payload["sprint_id"], current_user.id, "Sprint")
        eff_project_id = payload.get("project_id", task.project_id)
        if eff_project_id and sprint.project_id != eff_project_id:
            raise HTTPException(status_code=422, detail="Sprint belongs to a different project")
        if not eff_project_id:
            payload["project_id"] = sprint.project_id

    # Validate goal↔domain consistency only when the request touches either
    # field, so status toggles on legacy rows keep working.
    if "goal_id" in payload or "domain" in payload:
        eff_goal_id = payload.get("goal_id", task.goal_id)
        eff_domain = payload.get("domain", task.domain)
        if eff_goal_id:
            goal = await _get_owned(db, MacroGoal, eff_goal_id, current_user.id, "Goal")
            _check_goal_domain(goal, eff_domain)

    for k, v in payload.items():
        setattr(task, k, v)
    task.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await _get_owned(db, Task, task_id, current_user.id, "Task")
    await db.delete(task)
    await db.commit()
    return {"ok": True}
