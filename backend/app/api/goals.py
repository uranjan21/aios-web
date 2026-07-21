from datetime import date, datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.goal import MacroGoal, GoalProgress
from app.models.user import User

router = APIRouter(prefix="/api/goals", tags=["goals"])

class GoalCreate(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None
    category: str
    target_date: Optional[date] = None
    priority: Optional[str] = "medium"

class GoalProgressCreate(BaseModel):
    progress_score: int = Field(ge=0, le=100)
    ai_insight: Optional[str] = None

@router.post("", response_model=MacroGoal, status_code=201)
async def create_goal(
    body: GoalCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    goal = MacroGoal(
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        category=body.category,
        target_date=body.target_date,
        priority=body.priority,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal

@router.get("", response_model=List[MacroGoal])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    result = await db.execute(
        select(MacroGoal)
        .where(MacroGoal.user_id == current_user.id)
        .order_by(desc(MacroGoal.created_at))
    )
    return result.scalars().all()

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    category: Optional[str] = None
    target_date: Optional[date] = None
    status: Optional[str] = None
    priority: Optional[str] = None


@router.patch("/{goal_id}", response_model=MacroGoal)
async def update_goal(
    goal_id: uuid.UUID,
    body: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db),
):
    goal = await db.get(MacroGoal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in ("active", "completed", "archived"):
        raise HTTPException(status_code=422, detail="Invalid status")
    for f in ("title", "category"):
        if f in data and data[f] is None:
            raise HTTPException(status_code=422, detail=f"{f} cannot be null")
    for field, value in data.items():
        setattr(goal, field, value)
    goal.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db),
):
    goal = await db.get(MacroGoal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    # Unlink projects/tasks that reference this goal, and remove child
    # progress rows — none of these FKs have ON DELETE behaviour.
    from sqlalchemy import update as sa_update
    from app.models.workspace import Project, Task
    await db.execute(sa_update(Project).where(Project.goal_id == goal_id).values(goal_id=None))
    await db.execute(sa_update(Task).where(Task.goal_id == goal_id).values(goal_id=None))
    rows = (await db.execute(
        select(GoalProgress).where(GoalProgress.goal_id == goal_id)
    )).scalars().all()
    for r in rows:
        await db.delete(r)
    await db.delete(goal)
    await db.commit()
    return None


@router.post("/{goal_id}/progress", response_model=GoalProgress, status_code=201)
async def create_goal_progress(
    goal_id: uuid.UUID,
    body: GoalProgressCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    goal = await db.get(MacroGoal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    progress = GoalProgress(
        goal_id=goal_id,
        user_id=current_user.id,
        progress_score=body.progress_score,
        ai_insight=body.ai_insight
    )
    db.add(progress)
    await db.commit()
    await db.refresh(progress)
    return progress
