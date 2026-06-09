import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text


class Agent(SQLModel, table=True):
    __tablename__ = "agents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: str = Field(unique=True, nullable=False)
    name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    cron_expression: str = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    last_output_path: Optional[str] = None
    run_count: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
