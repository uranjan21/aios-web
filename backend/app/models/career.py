import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text


class CareerEvent(SQLModel, table=True):
    __tablename__ = "career_events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
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
    skill_name: str = Field(unique=True, nullable=False)
    category: str = Field(nullable=False)
    level: str = Field(nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    last_updated: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
