import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, UniqueConstraint


class Agent(SQLModel, table=True):
    __tablename__ = "agents"
    # Each user has their own copy of every agent — task_id is unique per user.
    __table_args__ = (
        UniqueConstraint("user_id", "task_id", name="uq_agent_user_task"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    task_id: str = Field(nullable=False)
    name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    cron_expression: str = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    last_output_path: Optional[str] = None
    last_output_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    run_count: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
