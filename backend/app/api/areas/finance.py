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
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    limit = min(limit, 200)
    query = select(FinanceExpense).order_by(desc(FinanceExpense.logged_at))
    result = await db.execute(query)
    all_expenses = result.scalars().all()
    if month:
        all_expenses = [e for e in all_expenses if e.logged_at.strftime("%Y-%m") == month]
    if category:
        all_expenses = [e for e in all_expenses if e.category.lower() == category.lower()]
    total = len(all_expenses)
    page = all_expenses[offset: offset + limit]
    return {"items": page, "total": total, "has_more": offset + limit < total}


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    logged_at: Optional[datetime] = None


@router.post("/expenses")
async def create_expense(body: ExpenseCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    expense = FinanceExpense(
        logged_at=body.logged_at or datetime.utcnow(),
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
