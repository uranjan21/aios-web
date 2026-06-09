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
    name: str = Field(nullable=False)
    type: AccountType = Field(nullable=False)
    balance: Decimal = Field(default=0, sa_column=Column(Numeric(12, 2)))
    currency: str = Field(default="USD", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)

class Category(SQLModel, table=True):
    __tablename__ = "finance_categories"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(nullable=False, unique=True)
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    icon: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)

class FinanceExpense(SQLModel, table=True):
    __tablename__ = "finance_expenses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    logged_at: datetime = Field(nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    category: Optional[str] = Field(nullable=True)
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    category_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    source: str = Field(default="agent", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class BudgetLimit(SQLModel, table=True):
    """Monthly spending cap per category. One row per category."""
    __tablename__ = "budget_limits"

    category: str = Field(primary_key=True, nullable=False)
    monthly_limit: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
