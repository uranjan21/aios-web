import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import Text, Numeric


class FinanceSnapshot(SQLModel, table=True):
    __tablename__ = "finance_snapshots"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    snapshot_month: date = Field(unique=True, nullable=False)
    salary: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    take_home: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    net_worth: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    cc_debt: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    emergency_fund: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    total_expenses: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_estimated: bool = Field(default=False, nullable=False)
    source: str = Field(default="vault_sync", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    LOAN = "loan"

class Account(SQLModel, table=True):
    __tablename__ = "finance_accounts"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    type: AccountType = Field(nullable=False)
    balance: Decimal = Field(default=0, sa_column=Column(Numeric(12, 2)))
    currency: str = Field(default="INR", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)

class Category(SQLModel, table=True):
    __tablename__ = "finance_categories"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False, unique=True)
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    icon: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)

class FinanceExpense(SQLModel, table=True):
    __tablename__ = "finance_expenses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    logged_at: datetime = Field(nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    category: Optional[str] = Field(nullable=True)
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    category_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    source: str = Field(default="agent", nullable=False)
    split_group_id: Optional[uuid.UUID] = Field(default=None)  # siblings of one split payment
    tags: Optional[str] = Field(default=None)  # comma-separated freeform labels
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class BudgetLimit(SQLModel, table=True):
    """Monthly spending cap per category. One row per category."""
    __tablename__ = "budget_limits"

    category: str = Field(primary_key=True, nullable=False)
    monthly_limit: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    alert_80_period: Optional[str] = Field(default=None)  # "YYYY-MM" the 80% alert last fired
    alert_100_period: Optional[str] = Field(default=None)  # "YYYY-MM" the 100% alert last fired
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class FinancialGoal(SQLModel, table=True):
    """Savings goals like Jupiter Pots / ET Money goals."""
    __tablename__ = "finance_goals"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    icon: str = Field(default="🎯", nullable=False)
    target_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    current_amount: Decimal = Field(default=0, sa_column=Column(Numeric(12, 2)))
    deadline: Optional[date] = None
    category: str = Field(default="general", nullable=False)  # emergency/vacation/car/education/general
    color: str = Field(default="#0D9488", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceBill(SQLModel, table=True):
    """Recurring bill tracker like Walnut/CRED."""
    __tablename__ = "finance_bills"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    due_day: int = Field(nullable=False)  # day of month 1-31
    category: str = Field(default="utilities", nullable=False)
    is_auto_debit: bool = Field(default=False)
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    last_posted_period: Optional[str] = Field(default=None)  # "YYYY-MM" of last auto-posted expense
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceIncome(SQLModel, table=True):
    """Income log — salary, freelance, etc."""
    __tablename__ = "finance_income"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    source: str = Field(nullable=False)  # salary/freelance/dividend/other
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    tags: Optional[str] = Field(default=None)  # comma-separated freeform labels
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    logged_at: datetime = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceTransfer(SQLModel, table=True):
    """Account-to-account transfer — Money Manager style third transaction type."""
    __tablename__ = "finance_transfers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    from_account_id: uuid.UUID = Field(foreign_key="finance_accounts.id", nullable=False)
    to_account_id: uuid.UUID = Field(foreign_key="finance_accounts.id", nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    logged_at: datetime = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceInvestment(SQLModel, table=True):
    """Portfolio holding — like INDmoney/ET Money investment tracker."""
    __tablename__ = "finance_investments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    type: str = Field(default="mutual_fund", nullable=False)  # stock/mutual_fund/fd/ppf/nps/crypto/gold/other
    invested_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    current_value: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    units: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(14, 4)))
    purchase_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceLoan(SQLModel, table=True):
    """EMI / loan tracker — like Money View / Walnut loan management."""
    __tablename__ = "finance_loans"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    loan_type: str = Field(default="personal", nullable=False)  # home/personal/car/education/credit_card/other
    lender: Optional[str] = Field(default=None)
    principal_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    outstanding_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    interest_rate: Decimal = Field(sa_column=Column(Numeric(5, 2), nullable=False))  # annual %
    emi_amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    emi_day: int = Field(nullable=False)  # day of month 1-31
    tenure_months: Optional[int] = Field(default=None)
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    last_posted_period: Optional[str] = Field(default=None)  # "YYYY-MM" of last auto-posted EMI
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
