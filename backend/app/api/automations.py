import uuid
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.automations import AutomationRule

router = APIRouter(prefix="/api/automations", tags=["Automations"])

# Template catalog (plan §8) — the only rules the engine knows how to run.
TEMPLATE_KEYS = {
    "bill_reminder_3d",
    "budget_80_push",
    "streak_save_evening",
    "weekly_review_sunday",
    "payday_snapshot",
    "idle_goal_nudge_7d",
}


class AutomationUpdate(BaseModel):
    enabled: bool
    params: Dict[str, Any] = {}

class AutomationResponse(BaseModel):
    id: uuid.UUID
    template_key: str
    enabled: bool
    params: Dict[str, Any]


@router.get("/", response_model=List[AutomationResponse])
async def get_automations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(AutomationRule).where(AutomationRule.user_id == current_user.id)
    result = await session.execute(stmt)
    rules = result.scalars().all()
    return rules

@router.put("/{template_key}", response_model=AutomationResponse)
async def update_automation(
    template_key: str,
    update_data: AutomationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    if template_key not in TEMPLATE_KEYS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown automation template")
    stmt = select(AutomationRule).where(
        AutomationRule.user_id == current_user.id,
        AutomationRule.template_key == template_key
    )
    result = await session.execute(stmt)
    rule = result.scalars().first()

    if not rule:
        rule = AutomationRule(
            user_id=current_user.id,
            template_key=template_key,
            enabled=update_data.enabled,
            params=update_data.params
        )
        session.add(rule)
    else:
        rule.enabled = update_data.enabled
        rule.params = update_data.params
        session.add(rule)

    await session.commit()
    await session.refresh(rule)
    return rule
