import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, desc
from datetime import datetime

from app.core.deps import get_current_user, get_db
from app.models.action import AgentAction
from app.models.user import User

router = APIRouter(prefix="/api/actions", tags=["actions"])

@router.get("", response_model=List[AgentAction])
async def list_actions(
    status: str = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    query = select(AgentAction).where(AgentAction.user_id == current_user.id)
    if status:
        query = query.where(AgentAction.status == status)
        
    query = query.order_by(desc(AgentAction.created_at))
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{action_id}/approve")
async def approve_action(
    action_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    action = await db.get(AgentAction, action_id)
    if not action or action.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Action not found")
        
    if action.status != "pending":
        raise HTTPException(status_code=400, detail="Action is not pending")
        
    # In V2, we would trigger action_runner.py here. For V1, we just mark it.
    action.status = "approved"
    action.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(action)
    return action

@router.post("/{action_id}/reject")
async def reject_action(
    action_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    action = await db.get(AgentAction, action_id)
    if not action or action.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Action not found")
        
    if action.status != "pending":
        raise HTTPException(status_code=400, detail="Action is not pending")
        
    action.status = "rejected"
    action.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(action)
    return action
