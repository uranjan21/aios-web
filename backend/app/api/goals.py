from datetime import date, datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.core.entitlements import AREA_MODULES
from app.models.goal import MacroGoal, GoalProgress
from app.models.user import User

router = APIRouter(prefix="/api/goals", tags=["goals"])

# `category` is a domain key, not free text: `workspace._check_goal_domain`
# matches a project/task `domain` against it, so an arbitrary string produces a
# goal no project can ever link to. Retired areas stay accepted because their
# rows still exist (frontend `config/domains.ts` RETIRED_DOMAINS).
GOAL_CATEGORIES = set(AREA_MODULES) | {"general", "business", "content"}
GOAL_PRIORITIES = {"low", "medium", "high", "urgent"}
GOAL_STATUSES = {"active", "completed", "archived"}


def _check_goal_enums(category: Optional[str], priority: Optional[str]) -> None:
    if category is not None and category not in GOAL_CATEGORIES:
        raise HTTPException(
            status_code=422,
            detail=f"category must be one of {sorted(GOAL_CATEGORIES)}",
        )
    if priority is not None and priority not in GOAL_PRIORITIES:
        raise HTTPException(
            status_code=422,
            detail=f"priority must be one of {sorted(GOAL_PRIORITIES)}",
        )


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
    _check_goal_enums(body.category, body.priority)
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

class GoalRead(BaseModel):
    """
    A goal plus the last progress score recorded against it.

    `progress_score` was write-only until now: the Weekly Review posts one every
    week via `POST /goals/{id}/progress` and nothing ever read it back. The area
    Overview pages need it to draw domain goal progress, so the list carries the
    most recent score (None when the goal has never been scored — the caller
    then falls back to its milestone completion ratio).
    """
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    category: str
    target_date: Optional[date] = None
    status: str
    priority: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    progress_score: Optional[int] = None


@router.get("", response_model=List[GoalRead])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    result = await db.execute(
        select(MacroGoal)
        .where(MacroGoal.user_id == current_user.id)
        .order_by(desc(MacroGoal.created_at))
    )
    goals = result.scalars().all()
    if not goals:
        return []

    # One sweep of this user's progress rows, newest first; the first row seen
    # per goal is its latest. Cheaper than a correlated subquery per goal and
    # the table is small (one row per goal per weekly review).
    rows = (await db.execute(
        select(GoalProgress)
        .where(GoalProgress.user_id == current_user.id)
        .order_by(desc(GoalProgress.date_recorded), desc(GoalProgress.created_at))
    )).scalars().all()
    latest: dict[uuid.UUID, int] = {}
    for r in rows:
        if r.goal_id not in latest and r.progress_score is not None:
            latest[r.goal_id] = r.progress_score

    return [
        GoalRead(**g.model_dump(), progress_score=latest.get(g.id))
        for g in goals
    ]

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
    if "status" in data and data["status"] not in GOAL_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid status")
    for f in ("title", "category"):
        if f in data and data[f] is None:
            raise HTTPException(status_code=422, detail=f"{f} cannot be null")
    _check_goal_enums(data.get("category"), data.get("priority"))
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
    from sqlalchemy import delete as sa_delete
    await db.execute(
        sa_delete(GoalProgress).where(
            GoalProgress.goal_id == goal_id,
            GoalProgress.user_id == current_user.id,
        )
    )
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
