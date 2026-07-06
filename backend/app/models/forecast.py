import uuid
from datetime import date, datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text

class Forecast(SQLModel, table=True):
    __tablename__ = "forecasts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    domain: str = Field(nullable=False) # e.g. finance, health
    metric: str = Field(nullable=False) # e.g. end_of_month_balance, weight
    target_date: date = Field(nullable=False)
    predicted_value: float = Field(nullable=False)
    confidence: float = Field(nullable=False) # e.g. 0.85 for 85% confidence
    ai_insight: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
