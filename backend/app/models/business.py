import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, Numeric


class Business(SQLModel, table=True):
    __tablename__ = "businesses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    business_type: str = Field(nullable=False)
    status: str = Field(default="active", nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    color: str = Field(default="var(--primary)")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class BusinessEvent(SQLModel, table=True):
    __tablename__ = "business_events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    business_id: Optional[uuid.UUID] = Field(foreign_key="businesses.id", index=True, nullable=True)
    occurred_at: datetime = Field(nullable=False)
    product: str = Field(default="ledgr", nullable=False) # kept for backwards compat/legacy events
    event_type: str = Field(nullable=False)
    title: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    mrr: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(10, 2)))
    source: str = Field(default="agent", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
