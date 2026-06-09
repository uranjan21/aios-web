from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.finance import FinanceSnapshot, FinanceExpense

router = APIRouter(prefix="/api/areas/finance", tags=["finance"])


@router.get("/snapshots")
async def list_snapshots(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceSnapshot).order_by(desc(FinanceSnapshot.snapshot_month)))
    return result.scalars().all()


@router.get("/snapshots/latest")
async def latest_snapshot(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(FinanceSnapshot).order_by(desc(FinanceSnapshot.snapshot_month)).limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/expenses")
async def list_expenses(
    month: Optional[str] = None,
    category: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    query = select(FinanceExpense).order_by(desc(FinanceExpense.logged_at)).limit(200)
    result = await db.execute(query)
    expenses = result.scalars().all()
    if month:
        expenses = [e for e in expenses if e.logged_at.strftime("%Y-%m") == month]
    if category:
        expenses = [e for e in expenses if e.category.lower() == category.lower()]
    return expenses


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    logged_at: Optional[datetime] = None


@router.post("/expenses")
async def create_expense(body: ExpenseCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    expense = FinanceExpense(
        logged_at=body.logged_at or datetime.now(timezone.utc),
        amount=body.amount,
        category=body.category,
        description=body.description,
        source="manual",
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.get("/goals")
async def get_goals(current_user=Depends(get_current_user)):
    from app.core.config import get_settings
    from app.services.vault_sync.writer import VaultWriteGuard
    import re
    settings = get_settings()
    guard = VaultWriteGuard(settings.vault_path)
    context = guard.read_file("01-finance/context.md")
    return {"raw_context": context[:2000] if context else None, "note": "Parse goals from context.md"}
