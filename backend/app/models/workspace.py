import uuid
from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import TIMESTAMP


class Project(SQLModel, table=True):
    __tablename__ = "projects"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    domain: Optional[str] = None  # e.g., 'finance', 'health', etc.
    goal_id: Optional[uuid.UUID] = Field(default=None, foreign_key="macro_goals.id", index=True)
    status: str = Field(default="active")  # active, completed, archived
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))


class Sprint(SQLModel, table=True):
    __tablename__ = "sprints"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    project_id: uuid.UUID = Field(foreign_key="projects.id", index=True)
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = Field(default="planned")  # planned, active, completed
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))


class Task(SQLModel, table=True):
    __tablename__ = "tasks"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    project_id: Optional[uuid.UUID] = Field(default=None, foreign_key="projects.id", index=True)
    sprint_id: Optional[uuid.UUID] = Field(default=None, foreign_key="sprints.id", index=True)
    goal_id: Optional[uuid.UUID] = Field(default=None, foreign_key="macro_goals.id", index=True)
    
    title: str = Field(index=True)
    description: Optional[str] = None
    domain: Optional[str] = None
    status: str = Field(default="todo")  # todo, in_progress, done
    priority: str = Field(default="medium")  # low, medium, high, urgent
    due_date: Optional[date] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
