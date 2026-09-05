import uuid
from datetime import date, datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import CheckConstraint, Text

class MacroGoal(SQLModel, table=True):
    __tablename__ = "macro_goals"
    # Mirrors migration m002_enum_checks.
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'completed', 'archived')",
            name="ck_macro_goals_status",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    title: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    category: str = Field(default="general", nullable=False) # finance, health, career, business, content
    target_date: Optional[date] = None
    status: str = Field(default="active", nullable=False) # active, completed, archived
    priority: Optional[str] = Field(default="medium")  # low, medium, high
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class GoalProgress(SQLModel, table=True):
    __tablename__ = "goal_progress"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    goal_id: uuid.UUID = Field(foreign_key="macro_goals.id", index=True, nullable=False)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    date_recorded: date = Field(default_factory=lambda: datetime.utcnow().date(), nullable=False)
    progress_score: Optional[int] = Field(default=0) # 0 to 100
    ai_insight: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
