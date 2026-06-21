import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text


class CareerEvent(SQLModel, table=True):
    __tablename__ = "career_events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    occurred_at: datetime = Field(nullable=False)
    event_type: str = Field(nullable=False)
    title: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    skill: Optional[str] = None
    skill_level: Optional[str] = None
    source: str = Field(default="agent", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class SkillInventory(SQLModel, table=True):
    __tablename__ = "skill_inventory"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    skill_name: str = Field(unique=True, nullable=False)
    category: str = Field(nullable=False)
    level: str = Field(nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    last_updated: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


# Job opportunity / application tracker
class JobOpportunity(SQLModel, table=True):
    __tablename__ = "job_opportunities"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    company: str = Field(nullable=False)
    role: str = Field(nullable=False)
    # status: prospect | applied | screening | interview | offer | rejected | closed
    status: str = Field(default="prospect", nullable=False)
    applied_date: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
