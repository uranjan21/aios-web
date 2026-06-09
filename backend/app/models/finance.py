import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field, Column
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)


class FinanceExpense(SQLModel, table=True):
    __tablename__ = "finance_expenses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    logged_at: datetime = Field(nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    category: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    source: str = Field(default="agent", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
