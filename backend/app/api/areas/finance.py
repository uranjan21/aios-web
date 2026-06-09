from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.finance import FinanceSnapshot, FinanceExpense, BudgetLimit, Account, Category, AccountType
import uuid

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
    time_range: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    limit = min(limit, 200)
    query = select(FinanceExpense).order_by(desc(FinanceExpense.logged_at))
    
    if month:
        try:
            m_date = datetime.strptime(month, "%Y-%m")
            next_m = m_date.replace(year=m_date.year+1, month=1) if m_date.month == 12 else m_date.replace(month=m_date.month+1)
            query = query.where(FinanceExpense.logged_at >= m_date)
            query = query.where(FinanceExpense.logged_at < next_m)
        except ValueError:
            pass

    if time_range:
        now = datetime.utcnow()
        if time_range.lower() == "day":
            query = query.where(FinanceExpense.logged_at >= now.replace(hour=0, minute=0, second=0, microsecond=0))
        elif time_range.lower() == "week":
            start_of_week = now - timedelta(days=7)
            query = query.where(FinanceExpense.logged_at >= start_of_week)
        elif time_range.lower() == "month":
            query = query.where(FinanceExpense.logged_at >= now.replace(day=1, hour=0, minute=0, second=0, microsecond=0))

    if category:
        from sqlalchemy import func
        query = query.where(func.lower(FinanceExpense.category) == category.lower())
        
    from sqlalchemy import func as sa_func
    count_query = select(sa_func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    page = result.scalars().all()
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


# ── Budget Limits ────────────────────────────────────────────

@router.get("/budgets")
async def list_budgets(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(BudgetLimit))
    return result.scalars().all()


class BudgetUpsert(BaseModel):
    category: str
    monthly_limit: float


@router.put("/budgets")
async def upsert_budget(body: BudgetUpsert, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Create or replace budget limit for a category."""
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.category == body.category))
    budget = result.scalar_one_or_none()
    if budget:
        budget.monthly_limit = body.monthly_limit
        budget.updated_at = datetime.utcnow()
    else:
        budget = BudgetLimit(category=body.category, monthly_limit=body.monthly_limit)
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/budgets/{category}")
async def delete_budget(category: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.category == category))
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    await db.delete(budget)
    await db.commit()
    return {"status": "deleted"}

# ── Accounts ────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Account).order_by(Account.name))
    return result.scalars().all()

class AccountCreate(BaseModel):
    name: str
    type: AccountType
    balance: float = 0
    currency: str = "USD"

@router.post("/accounts")
async def create_account(body: AccountCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    account = Account(name=body.name, type=body.type, balance=body.balance, currency=body.currency)
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account

@router.delete("/accounts/{account_id}")
async def delete_account(account_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
    await db.commit()
    return {"status": "deleted"}

# ── Categories ────────────────────────────────────────────

@router.get("/categories")
async def list_categories(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.name))
    return result.scalars().all()

class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    icon: Optional[str] = None

@router.post("/categories")
async def create_category(body: CategoryCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    existing = await db.execute(select(Category).where(Category.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category = Category(name=body.name, parent_id=body.parent_id, icon=body.icon)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.delete("/categories/{category_id}")
async def delete_category(category_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    await db.commit()
    return {"status": "deleted"}
