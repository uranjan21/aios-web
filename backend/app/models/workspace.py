import uuid
from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID as PG_UUID


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = Field(default=None, foreign_key="macro_goals.id", index=True)
    status: str = Field(default="active")  # active, completed, archived
    priority: Optional[str] = Field(default="medium")  # low, medium, high, urgent
    color: Optional[str] = None
    due_date: Optional[date] = None
    labels: Optional[str] = None  # comma-separated labels

    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))


class Sprint(SQLModel, table=True):
    __tablename__ = "sprints"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    project_id: uuid.UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    name: str
    goals: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = Field(default="planned")  # planned, active, completed
    capacity: Optional[int] = None  # story points / task capacity target

    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    project_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    )
    sprint_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True, index=True)
    )
    goal_id: Optional[uuid.UUID] = Field(default=None, foreign_key="macro_goals.id", index=True)

    title: str = Field(index=True)
    description: Optional[str] = None
    domain: Optional[str] = None
    status: str = Field(default="todo")  # todo, in_progress, done
    priority: str = Field(default="medium")  # low, medium, high, urgent
    due_date: Optional[date] = None
    labels: Optional[str] = None  # comma-separated labels

    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
