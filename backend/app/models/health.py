import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, Numeric


class HealthLog(SQLModel, table=True):
    __tablename__ = "health_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    logged_at: datetime = Field(nullable=False)
    entry_type: str = Field(nullable=False)
    value: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(8, 2)))
    unit: Optional[str] = None
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    source: str = Field(default="agent", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
