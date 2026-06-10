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


class HealthGoal(SQLModel, table=True):
    """Daily health targets — calories, water, steps, sleep."""
    __tablename__ = "health_goals"

    id: str = Field(default="singleton", primary_key=True)  # always one row
    calorie_target: int = Field(default=2000)
    protein_target: int = Field(default=150)   # grams
    carb_target: int = Field(default=250)      # grams
    fat_target: int = Field(default=65)        # grams
    water_target: int = Field(default=8)       # glasses (250ml each)
    steps_target: int = Field(default=10000)
    sleep_target: float = Field(default=8.0)   # hours
    height_cm: Optional[float] = Field(default=None)  # for BMI calc
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
