from datetime import date
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
        target_date=body.target_date
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

@router.get("/{goal_id}/progress", response_model=List[GoalProgress])
async def list_goal_progress(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    # Verify ownership
    goal = await db.get(MacroGoal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    result = await db.execute(
        select(GoalProgress)
        .where(GoalProgress.goal_id == goal_id)
        .where(GoalProgress.user_id == current_user.id)
        .order_by(desc(GoalProgress.created_at))
    )
    return result.scalars().all()

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
