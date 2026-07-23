"""Merchant auto-categorisation rules + manual email-ingestion trigger.

Mounted under /api/areas/finance by the finance router.
"""
import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.finance import MerchantRule
from app.models.user import User

router = APIRouter()


# ── Manual ingestion trigger ──────────────────────────────────────────────────
@router.post("/ingest/run")
async def run_ingest_now(
    newer_than_days: int = 3,
    user: User = Depends(get_current_user),
) -> Any:
    """Poll bank/CC alert emails now and queue new transactions for review."""
    from app.services.finance.email_ingest.runner import run_ingestion

    days = max(1, min(newer_than_days, 30))
    return await run_ingestion(user.id, newer_than_days=days)


# ── Merchant rules CRUD ───────────────────────────────────────────────────────
@router.get("/rules", response_model=List[MerchantRule])
async def list_rules(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(MerchantRule)
        .where(MerchantRule.user_id == user.id)
        .order_by(MerchantRule.priority.desc(), MerchantRule.created_at)
    )
    return result.scalars().all()


class RuleCreate(BaseModel):
    match_type: str = "contains"  # contains | equals | regex
    pattern: str
    category_id: Optional[uuid.UUID] = None
    account_id: Optional[uuid.UUID] = None
    priority: int = 0
    is_active: bool = True


_VALID_MATCH = {"contains", "equals", "regex"}


@router.post("/rules", response_model=MerchantRule)
async def create_rule(
    body: RuleCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    if body.match_type not in _VALID_MATCH:
        raise HTTPException(status_code=422, detail=f"match_type must be one of {_VALID_MATCH}")
    if not body.pattern.strip():
        raise HTTPException(status_code=422, detail="pattern is required")
    rule = MerchantRule(user_id=user.id, **body.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


class RuleUpdate(BaseModel):
    match_type: Optional[str] = None
    pattern: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    account_id: Optional[uuid.UUID] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


@router.patch("/rules/{rule_id}", response_model=MerchantRule)
async def update_rule(
    rule_id: uuid.UUID,
    body: RuleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    rule = await db.get(MerchantRule, rule_id)
    if not rule or rule.user_id != user.id:
        raise HTTPException(status_code=404, detail="Rule not found")
    data = body.model_dump(exclude_unset=True)
    if "match_type" in data and data["match_type"] not in _VALID_MATCH:
        raise HTTPException(status_code=422, detail=f"match_type must be one of {_VALID_MATCH}")
    for field, value in data.items():
        setattr(rule, field, value)
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    rule = await db.get(MerchantRule, rule_id)
    if not rule or rule.user_id != user.id:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"status": "deleted"}
