from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.finance import FinanceSnapshot, FinanceExpense, BudgetLimit, Account, Category, AccountType, FinancialGoal, FinanceBill, FinanceIncome, FinanceInvestment, FinanceLoan, FinanceTransfer
import uuid

router = APIRouter(prefix="/api/areas/finance", tags=["finance"])


async def _adjust_balance(db, account_id: Optional[uuid.UUID], delta: float, user_id: uuid.UUID) -> None:
    """Apply a signed delta to an account balance. No-op if account_id is None."""
    if account_id is None:
        return
    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == user_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.balance = float(account.balance) + delta
    db.add(account)


def _month_range(month: Optional[str]) -> tuple[datetime, datetime]:
    """Parse YYYY-MM into [start, end) datetimes; defaults to current month."""
    if month:
        try:
            start = datetime.strptime(month, "%Y-%m")
        except ValueError:
            start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1)
    else:
        end = start.replace(month=start.month + 1, day=1)
    return start, end


@router.get("/net-worth")
async def net_worth(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Live net worth computed from accounts + investments − active loans.

    Account balances are signed by the double-entry layer (credit card debt is
    negative), so a plain sum is correct for the accounts component.
    """
    accounts = (await db.execute(select(Account).where(Account.user_id == current_user.id))).scalars().all()
    investments = (await db.execute(select(FinanceInvestment).where(FinanceInvestment.user_id == current_user.id))).scalars().all()
    loans = (await db.execute(select(FinanceLoan).where(FinanceLoan.user_id == current_user.id, FinanceLoan.is_active == True))).scalars().all()

    accounts_total = sum(float(a.balance) for a in accounts)
    investments_total = sum(float(i.current_value) for i in investments)
    loans_outstanding = sum(float(l.outstanding_amount) for l in loans)

    return {
        "net_worth": accounts_total + investments_total - loans_outstanding,
        "accounts_total": accounts_total,
        "investments_total": investments_total,
        "loans_outstanding": loans_outstanding,
    }


class ImportItem(BaseModel):
    logged_at: datetime
    amount: float
    kind: str  # "expense" | "income"
    category: Optional[str] = None
    description: Optional[str] = None


class ImportCheckBody(BaseModel):
    items: list[ImportItem]


def _import_key(logged_at: datetime, amount: float, description: Optional[str]) -> tuple:
    return (logged_at.date(), round(float(amount), 2), (description or "").strip().lower())


async def _existing_import_keys(db, items: list[ImportItem], user_id: uuid.UUID) -> set:
    """Keys of existing expenses/income within the items' date range."""
    if not items:
        return set()
    lo = min(i.logged_at for i in items).replace(hour=0, minute=0, second=0, microsecond=0)
    hi = max(i.logged_at for i in items) + timedelta(days=1)

    keys = set()
    expenses = (await db.execute(
        select(FinanceExpense).where(FinanceExpense.user_id == user_id, FinanceExpense.logged_at >= lo, FinanceExpense.logged_at < hi)
    )).scalars().all()
    for e in expenses:
        keys.add(("expense",) + _import_key(e.logged_at, float(e.amount), e.description))
    income = (await db.execute(
        select(FinanceIncome).where(FinanceIncome.user_id == user_id, FinanceIncome.logged_at >= lo, FinanceIncome.logged_at < hi)
    )).scalars().all()
    for i in income:
        keys.add(("income",) + _import_key(i.logged_at, float(i.amount), i.description))
    return keys


@router.post("/import/check")
async def import_check(body: ImportCheckBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Flag which rows already exist (same kind + date + amount + description)."""
    existing = await _existing_import_keys(db, body.items, current_user.id)
    return {
        "duplicates": [
            idx for idx, item in enumerate(body.items)
            if (item.kind,) + _import_key(item.logged_at, item.amount, item.description) in existing
        ]
    }


class ImportCommitBody(BaseModel):
    account_id: Optional[uuid.UUID] = None
    items: list[ImportItem]


@router.post("/import/commit")
async def import_commit(body: ImportCommitBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Bulk-insert statement rows. Historical backfill — account balances are NOT adjusted.

    Duplicates (vs existing rows) are skipped server-side as a final guard.
    """
    existing = await _existing_import_keys(db, body.items, current_user.id)
    imported_expenses = 0
    imported_income = 0
    skipped = 0

    for item in body.items:
        if item.amount <= 0 or item.kind not in ("expense", "income"):
            skipped += 1
            continue
        if (item.kind,) + _import_key(item.logged_at, item.amount, item.description) in existing:
            skipped += 1
            continue
        if item.kind == "expense":
            db.add(FinanceExpense(
                user_id=current_user.id,
                logged_at=item.logged_at, amount=item.amount,
                category=item.category or "Uncategorized",
                description=item.description, account_id=body.account_id,
                source="import",
            ))
            imported_expenses += 1
        else:
            db.add(FinanceIncome(
                user_id=current_user.id,
                logged_at=item.logged_at, amount=item.amount,
                source=item.category or "other",
                description=item.description, account_id=body.account_id,
            ))
            imported_income += 1

    await db.commit()
    return {"imported_expenses": imported_expenses, "imported_income": imported_income, "skipped": skipped}


async def _compute_health_score_for_date(db, target_date: datetime, user_id: uuid.UUID) -> dict:
    from sqlalchemy import func
    
    month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        next_month_start = month_start.replace(year=month_start.year + 1, month=1)
    else:
        next_month_start = month_start.replace(month=month_start.month + 1)

    def clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
        return max(lo, min(hi, v))

    income_total = float((await db.execute(
        select(func.coalesce(func.sum(FinanceIncome.amount), 0))
        .where(FinanceIncome.user_id == user_id)
        .where(FinanceIncome.logged_at >= month_start)
        .where(FinanceIncome.logged_at < next_month_start)
    )).scalar_one())
    expense_total = float((await db.execute(
        select(func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.user_id == user_id)
        .where(FinanceExpense.logged_at >= month_start)
        .where(FinanceExpense.logged_at < next_month_start)
    )).scalar_one())

    components = []

    # 1. Savings rate — full marks at >=20% of income saved
    if income_total > 0:
        rate = (income_total - expense_total) / income_total * 100
        components.append({
            "key": "savings_rate", "label": "Savings Rate", "available": True,
            "score": round(clamp(rate / 20 * 100)),
            "display": f"{rate:.0f}% of income saved this month",
        })
    else:
        components.append({
            "key": "savings_rate", "label": "Savings Rate", "available": False,
            "score": None, "display": "No income logged this month",
        })

    # 2. Debt-to-income — full marks at <=30% of income going to EMIs, zero at >=60%
    loans = (await db.execute(select(FinanceLoan).where(FinanceLoan.user_id == user_id, FinanceLoan.is_active == True))).scalars().all()
    total_emi = sum(float(l.emi_amount) for l in loans)
    if not loans:
        components.append({
            "key": "dti", "label": "Debt-to-Income", "available": True,
            "score": 100, "display": "No active loans",
        })
    elif income_total > 0:
        dti = total_emi / income_total * 100
        components.append({
            "key": "dti", "label": "Debt-to-Income", "available": True,
            "score": round(clamp((60 - dti) / 30 * 100)),
            "display": f"{dti:.0f}% of income goes to EMIs",
        })
    else:
        components.append({
            "key": "dti", "label": "Debt-to-Income", "available": False,
            "score": None, "display": "No income logged this month",
        })

    # 3. Emergency fund — liquid balances vs avg monthly spend (last 90 days), full at >=6 months
    accounts = (await db.execute(select(Account).where(Account.user_id == user_id))).scalars().all()
    liquid = sum(max(float(a.balance), 0) for a in accounts if a.type in (AccountType.CHECKING, AccountType.SAVINGS))
    spend_90d = float((await db.execute(
        select(func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.user_id == user_id)
        .where(FinanceExpense.logged_at >= target_date - timedelta(days=90))
        .where(FinanceExpense.logged_at < target_date)
    )).scalar_one())
    avg_monthly = spend_90d / 3
    if avg_monthly > 0:
        months = liquid / avg_monthly
        components.append({
            "key": "emergency_fund", "label": "Emergency Fund", "available": True,
            "score": round(clamp(months / 6 * 100)),
            "display": f"{months:.1f} months of expenses covered",
        })
    else:
        components.append({
            "key": "emergency_fund", "label": "Emergency Fund", "available": False,
            "score": None, "display": "No expense history yet",
        })

    # 4. Budget adherence — share of budgeted categories still within their limit
    limits = (await db.execute(select(BudgetLimit).where(BudgetLimit.user_id == user_id))).scalars().all()
    limits = [l for l in limits if float(l.monthly_limit) > 0]
    if limits:
        within = 0
        limit_categories = [l.category for l in limits]
        spent_query = await db.execute(
            select(FinanceExpense.category, func.coalesce(func.sum(FinanceExpense.amount), 0))
            .where(FinanceExpense.user_id == user_id)
            .where(FinanceExpense.category.in_(limit_categories))
            .where(FinanceExpense.logged_at >= month_start)
            .where(FinanceExpense.logged_at < next_month_start)
            .group_by(FinanceExpense.category)
        )
        spent_by_category = {cat: float(amount) for cat, amount in spent_query.all()}
        
        for limit in limits:
            spent = spent_by_category.get(limit.category, 0.0)
            if spent <= float(limit.monthly_limit):
                within += 1
        components.append({
            "key": "budget_adherence", "label": "Budget Adherence", "available": True,
            "score": round(within / len(limits) * 100),
            "display": f"{within} of {len(limits)} budgets on track",
        })
    else:
        components.append({
            "key": "budget_adherence", "label": "Budget Adherence", "available": False,
            "score": None, "display": "No budgets set",
        })

    available = [c["score"] for c in components if c["available"]]
    score = round(sum(available) / len(available)) if available else 0
    band = "excellent" if score >= 80 else "good" if score >= 60 else "fair" if score >= 40 else "attention"

    return {"score": score, "band": band, "components": components}


@router.get("/health-score")
async def health_score(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Composite financial health score (0-100) from four components.

    Components with missing prerequisites (e.g. no income logged this month)
    are marked unavailable and excluded from the composite.
    """
    now = datetime.utcnow()
    current_data = await _compute_health_score_for_date(db, now, current_user.id)
    
    # Previous month score calculation
    prev_month_date = now.replace(day=1) - timedelta(days=1)
    prev_data = await _compute_health_score_for_date(db, prev_month_date, current_user.id)
    
    return {
        **current_data,
        "prev": prev_data
    }


@router.get("/snapshots")
async def list_snapshots(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceSnapshot).where(FinanceSnapshot.user_id == current_user.id).order_by(desc(FinanceSnapshot.snapshot_month)))
    return result.scalars().all()


@router.get("/snapshots/latest")
async def latest_snapshot(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(FinanceSnapshot).where(FinanceSnapshot.user_id == current_user.id).order_by(desc(FinanceSnapshot.snapshot_month)).limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/transactions/search")
async def search_transactions(
    q: Optional[str] = None,
    kind: Optional[str] = None,  # expense | income | transfer | None=all
    account_id: Optional[uuid.UUID] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    date_from: Optional[str] = None,  # YYYY-MM-DD
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Unified search across expenses, income and transfers — all months."""
    from sqlalchemy import or_

    limit = min(limit, 200)
    like = f"%{q}%" if q else None
    tag_like = f"%{tag}%" if tag else None

    def parse_date(s: Optional[str]) -> Optional[datetime]:
        if not s:
            return None
        try:
            return datetime.strptime(s, "%Y-%m-%d")
        except ValueError:
            return None

    d_from = parse_date(date_from)
    d_to = parse_date(date_to)
    if d_to:
        d_to = d_to + timedelta(days=1)  # inclusive end date

    def apply_common(query, model):
        query = query.where(model.user_id == current_user.id)
        if min_amount is not None:
            query = query.where(model.amount >= min_amount)
        if max_amount is not None:
            query = query.where(model.amount <= max_amount)
        if d_from:
            query = query.where(model.logged_at >= d_from)
        if d_to:
            query = query.where(model.logged_at < d_to)
        return query

    items = []

    # Category filter only applies to expenses; income/transfers have no category,
    # so setting it narrows results to expenses (like Money Manager).
    include_expense = kind in (None, "expense")
    include_income = kind in (None, "income") and not category
    include_transfer = kind in (None, "transfer") and not category and not tag

    if include_expense:
        query = apply_common(select(FinanceExpense), FinanceExpense)
        if like:
            query = query.where(or_(FinanceExpense.description.ilike(like), FinanceExpense.category.ilike(like), FinanceExpense.tags.ilike(like)))
        if tag_like:
            query = query.where(FinanceExpense.tags.ilike(tag_like))
        if account_id:
            query = query.where(FinanceExpense.account_id == account_id)
        if category:
            query = query.where(FinanceExpense.category == category)
        for e in (await db.execute(query)).scalars().all():
            items.append({
                "id": str(e.id), "kind": "expense", "logged_at": e.logged_at.isoformat(),
                "amount": float(e.amount), "category": e.category, "description": e.description,
                "account_id": str(e.account_id) if e.account_id else None,
                "tags": e.tags, "split_group_id": str(e.split_group_id) if e.split_group_id else None,
            })

    if include_income:
        query = apply_common(select(FinanceIncome), FinanceIncome)
        if like:
            query = query.where(or_(FinanceIncome.description.ilike(like), FinanceIncome.source.ilike(like), FinanceIncome.tags.ilike(like)))
        if tag_like:
            query = query.where(FinanceIncome.tags.ilike(tag_like))
        if account_id:
            query = query.where(FinanceIncome.account_id == account_id)
        for i in (await db.execute(query)).scalars().all():
            items.append({
                "id": str(i.id), "kind": "income", "logged_at": i.logged_at.isoformat(),
                "amount": float(i.amount), "category": i.source, "description": i.description,
                "account_id": str(i.account_id) if i.account_id else None,
                "tags": i.tags, "split_group_id": None,
            })

    if include_transfer:
        query = apply_common(select(FinanceTransfer), FinanceTransfer)
        if like:
            query = query.where(FinanceTransfer.description.ilike(like))
        if account_id:
            query = query.where(or_(FinanceTransfer.from_account_id == account_id, FinanceTransfer.to_account_id == account_id))
        for t in (await db.execute(query)).scalars().all():
            items.append({
                "id": str(t.id), "kind": "transfer", "logged_at": t.logged_at.isoformat(),
                "amount": float(t.amount), "category": "Transfer", "description": t.description,
                "account_id": str(t.from_account_id),
                "tags": None, "split_group_id": None,
            })

    items.sort(key=lambda x: x["logged_at"], reverse=True)
    total = len(items)
    page = items[offset:offset + limit]
    return {"items": page, "total": total, "has_more": offset + limit < total}


@router.get("/expenses")
async def list_expenses(
    month: Optional[str] = None,
    category: Optional[str] = None,
    time_range: Optional[str] = None,
    q: Optional[str] = None,
    account_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    limit = min(limit, 200)
    query = select(FinanceExpense).where(FinanceExpense.user_id == current_user.id).order_by(desc(FinanceExpense.logged_at))

    if q:
        from sqlalchemy import or_
        like = f"%{q}%"
        query = query.where(or_(FinanceExpense.description.ilike(like), FinanceExpense.category.ilike(like)))

    if account_id:
        query = query.where(FinanceExpense.account_id == account_id)

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


class SplitPart(BaseModel):
    category: str
    amount: float


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    logged_at: Optional[datetime] = None
    account_id: Optional[uuid.UUID] = None
    tags: Optional[str] = None
    splits: Optional[list[SplitPart]] = None  # parts must sum to amount


@router.post("/expenses")
async def create_expense(body: ExpenseCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")

    logged_at = body.logged_at or datetime.utcnow()
    created = []

    if body.splits:
        if any(s.amount <= 0 for s in body.splits):
            raise HTTPException(status_code=422, detail="Split amounts must be positive")
        if abs(sum(s.amount for s in body.splits) - body.amount) > 0.01:
            raise HTTPException(status_code=422, detail="Split amounts must sum to the total")
        group_id = uuid.uuid4()
        for part in body.splits:
            created.append(FinanceExpense(
                user_id=current_user.id,
                logged_at=logged_at, amount=part.amount, category=part.category,
                description=body.description, account_id=body.account_id,
                tags=body.tags, split_group_id=group_id, source="manual",
            ))
    else:
        created.append(FinanceExpense(
            user_id=current_user.id,
            logged_at=logged_at, amount=body.amount, category=body.category,
            description=body.description, account_id=body.account_id,
            tags=body.tags, source="manual",
        ))

    await _adjust_balance(db, body.account_id, -body.amount, current_user.id)
    for e in created:
        db.add(e)
    await db.commit()
    for e in created:
        await db.refresh(e)

    import asyncio
    from app.services.finance.budget_alerts import check_budget_alerts
    categories = {e.category for e in created if e.category}
    for cat in categories:
        asyncio.create_task(check_budget_alerts(cat))
    return created[0] if len(created) == 1 else {"split_group_id": str(created[0].split_group_id), "items": created}


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    logged_at: Optional[datetime] = None
    account_id: Optional[uuid.UUID] = None
    tags: Optional[str] = None


@router.patch("/expenses/{expense_id}")
async def update_expense(expense_id: uuid.UUID, body: ExpenseUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceExpense).where(FinanceExpense.id == expense_id, FinanceExpense.user_id == current_user.id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if body.amount is not None and body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")

    # Revert old balance effect, apply new one
    await _adjust_balance(db, expense.account_id, float(expense.amount), current_user.id)
    if body.amount is not None:
        expense.amount = body.amount
    if body.category is not None:
        expense.category = body.category
    if body.description is not None:
        expense.description = body.description
    if body.logged_at is not None:
        expense.logged_at = body.logged_at
    if "tags" in body.model_fields_set:
        expense.tags = body.tags
    if "account_id" in body.model_fields_set:
        expense.account_id = body.account_id
    await _adjust_balance(db, expense.account_id, -float(expense.amount), current_user.id)

    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    if expense.category:
        import asyncio
        from app.services.finance.budget_alerts import check_budget_alerts
        asyncio.create_task(check_budget_alerts(expense.category))
    return expense


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceExpense).where(FinanceExpense.id == expense_id, FinanceExpense.user_id == current_user.id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await _adjust_balance(db, expense.account_id, float(expense.amount), current_user.id)
    await db.delete(expense)
    await db.commit()
    return {"status": "deleted"}


# ── Financial Goals ────────────────────────────────────────────

@router.get("/goals")
async def list_goals(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.user_id == current_user.id).order_by(FinancialGoal.created_at))
    return result.scalars().all()


class GoalCreate(BaseModel):
    name: str
    icon: str = "🎯"
    target_amount: float
    current_amount: float = 0
    deadline: Optional[str] = None  # ISO date string YYYY-MM-DD
    category: str = "general"
    color: str = "#0D9488"


@router.post("/goals")
async def create_goal(body: GoalCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    from datetime import date as date_type
    deadline = date_type.fromisoformat(body.deadline) if body.deadline else None
    goal = FinancialGoal(
        user_id=current_user.id,
        name=body.name,
        icon=body.icon,
        target_amount=body.target_amount,
        current_amount=body.current_amount,
        deadline=deadline,
        category=body.category,
        color=body.color,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[str] = None
    color: Optional[str] = None


@router.patch("/goals/{goal_id}")
async def update_goal(goal_id: uuid.UUID, body: GoalUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    from datetime import date as date_type
    if body.name is not None:
        goal.name = body.name
    if body.icon is not None:
        goal.icon = body.icon
    if body.target_amount is not None:
        goal.target_amount = body.target_amount
    if body.current_amount is not None:
        goal.current_amount = body.current_amount
    if "deadline" in body.model_fields_set:
        goal.deadline = date_type.fromisoformat(body.deadline) if body.deadline is not None else None
    if body.color is not None:
        goal.color = body.color
    goal.updated_at = datetime.utcnow()
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
    return {"status": "deleted"}


# ── Bills ────────────────────────────────────────────

@router.get("/bills")
async def list_bills(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceBill).where(FinanceBill.user_id == current_user.id).order_by(FinanceBill.due_day))
    return result.scalars().all()


class BillCreate(BaseModel):
    name: str
    amount: float
    due_day: int
    category: str = "utilities"
    is_auto_debit: bool = False
    is_active: bool = True
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.post("/bills")
async def create_bill(body: BillCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    bill = FinanceBill(
        user_id=current_user.id,
        name=body.name,
        amount=body.amount,
        due_day=body.due_day,
        category=body.category,
        is_auto_debit=body.is_auto_debit,
        is_active=body.is_active,
        notes=body.notes,
        account_id=body.account_id,
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    due_day: Optional[int] = None
    category: Optional[str] = None
    is_auto_debit: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.patch("/bills/{bill_id}")
async def update_bill(bill_id: uuid.UUID, body: BillUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceBill).where(FinanceBill.id == bill_id, FinanceBill.user_id == current_user.id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(bill, field, value)
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


@router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceBill).where(FinanceBill.id == bill_id, FinanceBill.user_id == current_user.id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    await db.delete(bill)
    await db.commit()
    return {"status": "deleted"}


# ── Income ────────────────────────────────────────────

@router.get("/income")
async def list_income(month: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    query = select(FinanceIncome).where(FinanceIncome.user_id == current_user.id).order_by(desc(FinanceIncome.logged_at))

    if month:
        try:
            m_date = datetime.strptime(month, "%Y-%m")
            next_m = m_date.replace(year=m_date.year+1, month=1) if m_date.month == 12 else m_date.replace(month=m_date.month+1)
            query = query.where(FinanceIncome.logged_at >= m_date)
            query = query.where(FinanceIncome.logged_at < next_m)
        except ValueError:
            pass
    else:
        query = query.limit(50)

    result = await db.execute(query)
    return result.scalars().all()


class IncomeCreate(BaseModel):
    amount: float
    source: str
    description: Optional[str] = None
    logged_at: Optional[datetime] = None
    account_id: Optional[uuid.UUID] = None
    tags: Optional[str] = None


@router.post("/income")
async def create_income(body: IncomeCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")
    income = FinanceIncome(
        user_id=current_user.id,
        amount=body.amount,
        source=body.source,
        description=body.description,
        account_id=body.account_id,
        tags=body.tags,
        logged_at=body.logged_at or datetime.utcnow(),
    )
    await _adjust_balance(db, body.account_id, body.amount, current_user.id)
    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income


class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    source: Optional[str] = None
    description: Optional[str] = None
    logged_at: Optional[datetime] = None
    account_id: Optional[uuid.UUID] = None
    tags: Optional[str] = None


@router.patch("/income/{income_id}")
async def update_income(income_id: uuid.UUID, body: IncomeUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceIncome).where(FinanceIncome.id == income_id, FinanceIncome.user_id == current_user.id))
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    if body.amount is not None and body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")

    # Revert old balance effect, apply new one
    await _adjust_balance(db, income.account_id, -float(income.amount), current_user.id)
    if body.amount is not None:
        income.amount = body.amount
    if body.source is not None:
        income.source = body.source
    if body.description is not None:
        income.description = body.description
    if body.logged_at is not None:
        income.logged_at = body.logged_at
    if "tags" in body.model_fields_set:
        income.tags = body.tags
    if "account_id" in body.model_fields_set:
        income.account_id = body.account_id
    await _adjust_balance(db, income.account_id, float(income.amount), current_user.id)

    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income


@router.delete("/income/{income_id}")
async def delete_income(income_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceIncome).where(FinanceIncome.id == income_id, FinanceIncome.user_id == current_user.id))
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    await _adjust_balance(db, income.account_id, -float(income.amount), current_user.id)
    await db.delete(income)
    await db.commit()
    return {"status": "deleted"}


# ── Transfers ────────────────────────────────────────────

@router.get("/transfers")
async def list_transfers(month: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    query = select(FinanceTransfer).where(FinanceTransfer.user_id == current_user.id).order_by(desc(FinanceTransfer.logged_at))
    if month:
        start, end = _month_range(month)
        query = query.where(FinanceTransfer.logged_at >= start).where(FinanceTransfer.logged_at < end)
    else:
        query = query.limit(50)
    result = await db.execute(query)
    return result.scalars().all()


class TransferCreate(BaseModel):
    amount: float
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    description: Optional[str] = None
    logged_at: Optional[datetime] = None


@router.post("/transfers")
async def create_transfer(body: TransferCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")
    if body.from_account_id == body.to_account_id:
        raise HTTPException(status_code=422, detail="From and to accounts must differ")
    transfer = FinanceTransfer(
        user_id=current_user.id,
        amount=body.amount,
        from_account_id=body.from_account_id,
        to_account_id=body.to_account_id,
        description=body.description,
        logged_at=body.logged_at or datetime.utcnow(),
    )
    await _adjust_balance(db, body.from_account_id, -body.amount, current_user.id)
    await _adjust_balance(db, body.to_account_id, body.amount, current_user.id)
    db.add(transfer)
    await db.commit()
    await db.refresh(transfer)
    return transfer


@router.delete("/transfers/{transfer_id}")
async def delete_transfer(transfer_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceTransfer).where(FinanceTransfer.id == transfer_id, FinanceTransfer.user_id == current_user.id))
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    await _adjust_balance(db, transfer.from_account_id, float(transfer.amount), current_user.id)
    await _adjust_balance(db, transfer.to_account_id, -float(transfer.amount), current_user.id)
    await db.delete(transfer)
    await db.commit()
    return {"status": "deleted"}


# ── Cashflow ────────────────────────────────────────────

@router.get("/cashflow")
async def cashflow(month: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlalchemy import func
    from datetime import date as date_type
    if month:
        try:
            month_start = datetime.strptime(month, "%Y-%m")
        except ValueError:
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        month_end = month_start.replace(month=month_start.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # totals
    income_result = await db.execute(
        select(func.coalesce(func.sum(FinanceIncome.amount), 0))
        .where(FinanceIncome.user_id == current_user.id)
        .where(FinanceIncome.logged_at >= month_start)
        .where(FinanceIncome.logged_at < month_end)
    )
    income_total = float(income_result.scalar_one())

    expense_result = await db.execute(
        select(func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.user_id == current_user.id)
        .where(FinanceExpense.logged_at >= month_start)
        .where(FinanceExpense.logged_at < month_end)
    )
    expense_total = float(expense_result.scalar_one())

    savings_rate = round((income_total - expense_total) / income_total * 100, 2) if income_total > 0 else 0.0

    # by day — merge income and expense rows
    income_rows = await db.execute(
        select(FinanceIncome.logged_at, FinanceIncome.amount)
        .where(FinanceIncome.user_id == current_user.id)
        .where(FinanceIncome.logged_at >= month_start)
        .where(FinanceIncome.logged_at < month_end)
    )
    expense_rows = await db.execute(
        select(FinanceExpense.logged_at, FinanceExpense.amount)
        .where(FinanceExpense.user_id == current_user.id)
        .where(FinanceExpense.logged_at >= month_start)
        .where(FinanceExpense.logged_at < month_end)
    )

    day_income: dict[str, float] = {}
    for logged_at, amount in income_rows.all():
        d = logged_at.date().isoformat()
        day_income[d] = day_income.get(d, 0.0) + float(amount)

    day_expense: dict[str, float] = {}
    for logged_at, amount in expense_rows.all():
        d = logged_at.date().isoformat()
        day_expense[d] = day_expense.get(d, 0.0) + float(amount)

    all_days = sorted(set(day_income) | set(day_expense))
    by_day = [
        {"date": d, "income": day_income.get(d, 0.0), "expense": day_expense.get(d, 0.0)}
        for d in all_days
    ]

    return {
        "month": month_start.strftime("%Y-%m"),
        "income_total": income_total,
        "expense_total": expense_total,
        "savings_rate": savings_rate,
        "by_day": by_day,
    }


# ── Budget Limits ────────────────────────────────────────────

@router.get("/budgets")
async def list_budgets(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.user_id == current_user.id))
    return result.scalars().all()


@router.get("/budgets/status")
async def budget_status(month: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Per-category budget limit vs actual spend for a month — Money Manager budget graph data."""
    from sqlalchemy import func
    start, end = _month_range(month)

    budgets_result = await db.execute(select(BudgetLimit).where(BudgetLimit.user_id == current_user.id))
    budgets = budgets_result.scalars().all()

    spent_result = await db.execute(
        select(FinanceExpense.category, func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.user_id == current_user.id)
        .where(FinanceExpense.logged_at >= start)
        .where(FinanceExpense.logged_at < end)
        .group_by(FinanceExpense.category)
    )
    spent_by_category = {cat: float(total) for cat, total in spent_result.all() if cat}

    items = []
    for b in budgets:
        spent = spent_by_category.get(b.category, 0.0)
        limit = float(b.monthly_limit)
        items.append({
            "category": b.category,
            "monthly_limit": limit,
            "spent": spent,
            "remaining": limit - spent,
            "pct": round(spent / limit * 100, 1) if limit > 0 else 0.0,
        })
    items.sort(key=lambda x: x["pct"], reverse=True)
    return {"month": start.strftime("%Y-%m"), "items": items}


class BudgetUpsert(BaseModel):
    category: str
    monthly_limit: float


@router.put("/budgets")
async def upsert_budget(body: BudgetUpsert, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Create or replace budget limit for a category."""
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.category == body.category, BudgetLimit.user_id == current_user.id))
    budget = result.scalar_one_or_none()
    if budget:
        budget.monthly_limit = body.monthly_limit
        budget.updated_at = datetime.utcnow()
    else:
        budget = BudgetLimit(user_id=current_user.id, category=body.category, monthly_limit=body.monthly_limit)
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/budgets/{category}")
async def delete_budget(category: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.category == category, BudgetLimit.user_id == current_user.id))
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    await db.delete(budget)
    await db.commit()
    return {"status": "deleted"}

# ── Accounts ────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Account).where(Account.user_id == current_user.id).order_by(Account.name))
    return result.scalars().all()

class AccountCreate(BaseModel):
    name: str
    type: AccountType
    balance: float = 0
    currency: str = "INR"

@router.post("/accounts")
async def create_account(body: AccountCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    account = Account(user_id=current_user.id, name=body.name, type=body.type, balance=body.balance, currency=body.currency)
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account

@router.get("/accounts/{account_id}/ledger")
async def account_ledger(account_id: uuid.UUID, limit: int = 50, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Unified recent transaction history for one account: expenses, income, transfers."""
    limit = min(limit, 200)

    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    expenses = (await db.execute(
        select(FinanceExpense).where(FinanceExpense.account_id == account_id, FinanceExpense.user_id == current_user.id)
        .order_by(desc(FinanceExpense.logged_at)).limit(limit)
    )).scalars().all()
    income = (await db.execute(
        select(FinanceIncome).where(FinanceIncome.account_id == account_id, FinanceIncome.user_id == current_user.id)
        .order_by(desc(FinanceIncome.logged_at)).limit(limit)
    )).scalars().all()
    transfers = (await db.execute(
        select(FinanceTransfer)
        .where((FinanceTransfer.from_account_id == account_id) | (FinanceTransfer.to_account_id == account_id))
        .where(FinanceTransfer.user_id == current_user.id)
        .order_by(desc(FinanceTransfer.logged_at)).limit(limit)
    )).scalars().all()

    entries = []
    for e in expenses:
        entries.append({"id": str(e.id), "kind": "expense", "amount": -float(e.amount), "label": e.description or e.category or "Expense", "logged_at": e.logged_at.isoformat()})
    for i in income:
        entries.append({"id": str(i.id), "kind": "income", "amount": float(i.amount), "label": i.description or i.source, "logged_at": i.logged_at.isoformat()})
    for t in transfers:
        outgoing = t.from_account_id == account_id
        entries.append({"id": str(t.id), "kind": "transfer", "amount": -float(t.amount) if outgoing else float(t.amount), "label": t.description or ("Transfer out" if outgoing else "Transfer in"), "logged_at": t.logged_at.isoformat()})

    entries.sort(key=lambda x: x["logged_at"], reverse=True)
    return {"account": account, "entries": entries[:limit]}


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    balance: Optional[float] = None
    currency: Optional[str] = None


@router.patch("/accounts/{account_id}")
async def update_account(
    account_id: uuid.UUID,
    body: AccountUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    updates = body.model_dump(exclude_unset=True)
    if "name" in updates:
        name = (updates["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        account.name = name
    if "type" in updates and updates["type"] is not None:
        account.type = updates["type"]
    if "balance" in updates and updates["balance"] is not None:
        account.balance = Decimal(str(updates["balance"]))
    if "currency" in updates:
        currency = (updates["currency"] or "").strip().upper()
        if not currency:
            raise HTTPException(status_code=400, detail="Currency cannot be empty")
        account.currency = currency

    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
    await db.commit()
    return {"status": "deleted"}

# ── Categories ────────────────────────────────────────────

@router.get("/categories")
async def list_categories(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Category).where(Category.user_id == current_user.id).order_by(Category.name))
    return result.scalars().all()

class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    icon: Optional[str] = None

@router.post("/categories")
async def create_category(body: CategoryCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    existing = await db.execute(select(Category).where(Category.name == body.name, Category.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    if body.parent_id is not None:
        parent_result = await db.execute(select(Category).where(Category.id == body.parent_id, Category.user_id == current_user.id))
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")
        if parent.parent_id is not None:
            raise HTTPException(status_code=422, detail="Parent category must be a top-level category (max 2 levels)")

    category = Category(user_id=current_user.id, name=body.name, parent_id=body.parent_id, icon=body.icon)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None

@router.patch("/categories/{category_id}")
async def update_category(category_id: uuid.UUID, body: CategoryUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Category).where(Category.id == category_id, Category.user_id == current_user.id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if body.name is not None and body.name != category.name:
        existing = await db.execute(select(Category).where(Category.name == body.name, Category.user_id == current_user.id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Category with this name already exists")
        category.name = body.name

    if "parent_id" in body.model_fields_set:
        new_parent_id = body.parent_id
        if new_parent_id is not None:
            if new_parent_id == category.id:
                raise HTTPException(status_code=422, detail="Category cannot be its own parent")
            parent_result = await db.execute(select(Category).where(Category.id == new_parent_id, Category.user_id == current_user.id))
            parent = parent_result.scalar_one_or_none()
            if not parent:
                raise HTTPException(status_code=404, detail="Parent category not found")
            if parent.parent_id is not None:
                raise HTTPException(status_code=422, detail="Parent category must be a top-level category (max 2 levels)")
            children = await db.execute(select(Category).where(Category.parent_id == category.id, Category.user_id == current_user.id))
            if children.scalars().first():
                raise HTTPException(status_code=422, detail="Category has subcategories and cannot become a subcategory itself")
        category.parent_id = new_parent_id

    if body.icon is not None:
        category.icon = body.icon

    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.delete("/categories/{category_id}")
async def delete_category(category_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Category).where(Category.id == category_id, Category.user_id == current_user.id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    await db.commit()
    return {"status": "deleted"}


# ── Investments (portfolio tracker) ────────────────────────────────────────────

@router.get("/investments")
async def list_investments(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.user_id == current_user.id).order_by(desc(FinanceInvestment.current_value)))
    return result.scalars().all()


@router.get("/investments/summary")
async def investments_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.user_id == current_user.id))
    investments = result.scalars().all()

    total_invested = sum(float(i.invested_amount) for i in investments)
    total_current = sum(float(i.current_value) for i in investments)
    returns_amount = total_current - total_invested
    returns_pct = round((returns_amount / total_invested) * 100, 2) if total_invested > 0 else 0.0

    by_type: dict[str, float] = {}
    for i in investments:
        by_type[i.type] = by_type.get(i.type, 0.0) + float(i.current_value)
    allocation = [{"type": t, "value": v} for t, v in sorted(by_type.items(), key=lambda x: -x[1])]

    return {
        "total_invested": total_invested,
        "current_value": total_current,
        "returns_amount": returns_amount,
        "returns_pct": returns_pct,
        "allocation": allocation,
    }


class InvestmentCreate(BaseModel):
    name: str
    type: str = "mutual_fund"
    invested_amount: float
    current_value: float
    units: Optional[float] = None
    purchase_date: Optional[str] = None  # ISO date YYYY-MM-DD
    notes: Optional[str] = None


@router.post("/investments")
async def create_investment(body: InvestmentCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    from datetime import date as date_type
    investment = FinanceInvestment(
        user_id=current_user.id,
        name=body.name,
        type=body.type,
        invested_amount=body.invested_amount,
        current_value=body.current_value,
        units=body.units,
        purchase_date=date_type.fromisoformat(body.purchase_date) if body.purchase_date else None,
        notes=body.notes,
    )
    db.add(investment)
    await db.commit()
    await db.refresh(investment)
    return investment


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    invested_amount: Optional[float] = None
    current_value: Optional[float] = None
    units: Optional[float] = None
    purchase_date: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/investments/{investment_id}")
async def update_investment(investment_id: uuid.UUID, body: InvestmentUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.id == investment_id, FinanceInvestment.user_id == current_user.id))
    investment = result.scalar_one_or_none()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    from datetime import date as date_type
    data = body.model_dump(exclude_unset=True)
    if "purchase_date" in data:
        data["purchase_date"] = date_type.fromisoformat(data["purchase_date"]) if data["purchase_date"] else None
    for field, value in data.items():
        setattr(investment, field, value)
    investment.updated_at = datetime.utcnow()
    db.add(investment)
    await db.commit()
    await db.refresh(investment)
    return investment


@router.delete("/investments/{investment_id}")
async def delete_investment(investment_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.id == investment_id, FinanceInvestment.user_id == current_user.id))
    investment = result.scalar_one_or_none()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    await db.delete(investment)
    await db.commit()
    return {"status": "deleted"}


# ── Loans / EMI tracker ────────────────────────────────────────────

@router.get("/loans")
async def list_loans(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.user_id == current_user.id).order_by(desc(FinanceLoan.is_active), FinanceLoan.emi_day))
    return result.scalars().all()


@router.get("/loans/summary")
async def loans_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.user_id == current_user.id, FinanceLoan.is_active == True))
    loans = result.scalars().all()
    total_outstanding = sum(float(l.outstanding_amount) for l in loans)
    total_emi = sum(float(l.emi_amount) for l in loans)
    return {
        "total_outstanding": total_outstanding,
        "total_emi": total_emi,
        "active_count": len(loans),
    }


class LoanCreate(BaseModel):
    name: str
    loan_type: str = "personal"
    lender: Optional[str] = None
    principal_amount: float
    outstanding_amount: float
    interest_rate: float
    emi_amount: float
    emi_day: int
    tenure_months: Optional[int] = None
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.post("/loans")
async def create_loan(body: LoanCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    loan = FinanceLoan(
        user_id=current_user.id,
        name=body.name,
        loan_type=body.loan_type,
        lender=body.lender,
        principal_amount=body.principal_amount,
        outstanding_amount=body.outstanding_amount,
        interest_rate=body.interest_rate,
        emi_amount=body.emi_amount,
        emi_day=body.emi_day,
        tenure_months=body.tenure_months,
        notes=body.notes,
        account_id=body.account_id,
    )
    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    return loan


class LoanUpdate(BaseModel):
    name: Optional[str] = None
    loan_type: Optional[str] = None
    lender: Optional[str] = None
    principal_amount: Optional[float] = None
    outstanding_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    emi_amount: Optional[float] = None
    emi_day: Optional[int] = None
    tenure_months: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.patch("/loans/{loan_id}")
async def update_loan(loan_id: uuid.UUID, body: LoanUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.id == loan_id, FinanceLoan.user_id == current_user.id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(loan, field, value)
    loan.updated_at = datetime.utcnow()
    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    return loan


@router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.id == loan_id, FinanceLoan.user_id == current_user.id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db.delete(loan)
    await db.commit()
    return {"status": "deleted"}
