from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.finance import FinanceSnapshot, FinanceExpense, BudgetLimit, Account, Category, AccountType, FinancialGoal, FinanceBill, FinanceIncome, FinanceInvestment, FinanceLoan
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


# ── Financial Goals ────────────────────────────────────────────

@router.get("/goals")
async def list_goals(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinancialGoal).order_by(FinancialGoal.created_at))
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
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.id == goal_id))
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
    if body.deadline is not None:
        goal.deadline = date_type.fromisoformat(body.deadline)
    if body.color is not None:
        goal.color = body.color
    goal.updated_at = datetime.utcnow()
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
    return {"status": "deleted"}


# ── Bills ────────────────────────────────────────────

@router.get("/bills")
async def list_bills(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceBill).order_by(FinanceBill.due_day))
    return result.scalars().all()


class BillCreate(BaseModel):
    name: str
    amount: float
    due_day: int
    category: str = "utilities"
    is_auto_debit: bool = False
    is_active: bool = True
    notes: Optional[str] = None


@router.post("/bills")
async def create_bill(body: BillCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    bill = FinanceBill(
        name=body.name,
        amount=body.amount,
        due_day=body.due_day,
        category=body.category,
        is_auto_debit=body.is_auto_debit,
        is_active=body.is_active,
        notes=body.notes,
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


@router.patch("/bills/{bill_id}")
async def update_bill(bill_id: uuid.UUID, body: BillUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceBill).where(FinanceBill.id == bill_id))
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
    result = await db.execute(select(FinanceBill).where(FinanceBill.id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    await db.delete(bill)
    await db.commit()
    return {"status": "deleted"}


# ── Income ────────────────────────────────────────────

@router.get("/income")
async def list_income(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(FinanceIncome).order_by(desc(FinanceIncome.logged_at)).limit(50)
    )
    return result.scalars().all()


class IncomeCreate(BaseModel):
    amount: float
    source: str
    description: Optional[str] = None
    logged_at: Optional[datetime] = None


@router.post("/income")
async def create_income(body: IncomeCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    income = FinanceIncome(
        amount=body.amount,
        source=body.source,
        description=body.description,
        logged_at=body.logged_at or datetime.utcnow(),
    )
    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income


# ── Cashflow ────────────────────────────────────────────

@router.get("/cashflow")
async def cashflow(current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlalchemy import func
    from datetime import date as date_type
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        month_end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        month_end = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # totals
    income_result = await db.execute(
        select(func.coalesce(func.sum(FinanceIncome.amount), 0))
        .where(FinanceIncome.logged_at >= month_start)
        .where(FinanceIncome.logged_at < month_end)
    )
    income_total = float(income_result.scalar_one())

    expense_result = await db.execute(
        select(func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.logged_at >= month_start)
        .where(FinanceExpense.logged_at < month_end)
    )
    expense_total = float(expense_result.scalar_one())

    savings_rate = round((income_total - expense_total) / income_total * 100, 2) if income_total > 0 else 0.0

    # by day — merge income and expense rows
    income_rows = await db.execute(
        select(FinanceIncome.logged_at, FinanceIncome.amount)
        .where(FinanceIncome.logged_at >= month_start)
        .where(FinanceIncome.logged_at < month_end)
    )
    expense_rows = await db.execute(
        select(FinanceExpense.logged_at, FinanceExpense.amount)
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
        "income_total": income_total,
        "expense_total": expense_total,
        "savings_rate": savings_rate,
        "by_day": by_day,
    }


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


# ── Investments (portfolio tracker) ────────────────────────────────────────────

@router.get("/investments")
async def list_investments(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).order_by(desc(FinanceInvestment.current_value)))
    return result.scalars().all()


@router.get("/investments/summary")
async def investments_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment))
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
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.id == investment_id))
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
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.id == investment_id))
    investment = result.scalar_one_or_none()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    await db.delete(investment)
    await db.commit()
    return {"status": "deleted"}


# ── Loans / EMI tracker ────────────────────────────────────────────

@router.get("/loans")
async def list_loans(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).order_by(desc(FinanceLoan.is_active), FinanceLoan.emi_day))
    return result.scalars().all()


@router.get("/loans/summary")
async def loans_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.is_active == True))
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


@router.post("/loans")
async def create_loan(body: LoanCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    loan = FinanceLoan(
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


@router.patch("/loans/{loan_id}")
async def update_loan(loan_id: uuid.UUID, body: LoanUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.id == loan_id))
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
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.id == loan_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db.delete(loan)
    await db.commit()
    return {"status": "deleted"}
