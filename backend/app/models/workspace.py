import uuid
from datetime import datetime, date, time
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import CheckConstraint, Column, ForeignKey
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
    # Mirrors migration m002_enum_checks. Project/Sprint carry the same words
    # but nothing validates them anywhere, so they are left unconstrained
    # until a writer is pinned down — see the note at the end of that file.
    __table_args__ = (
        CheckConstraint(
            "status IN ('todo', 'in_progress', 'done')",
            name="ck_tasks_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_tasks_priority",
        ),
    )

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


class Milestone(SQLModel, table=True):
    """
    A dated checkpoint on the way to a goal.

    Added 2026-08-01 for the redesign's Workspace -> Milestones destination.
    Deliberately thinner than Task: a milestone is a date you are steering
    toward, not a unit of work you execute, so it carries no sprint, no
    project and no priority — only a goal, a domain and a due date.

    `goal_id` is SET NULL rather than CASCADE: deleting a goal should orphan
    its milestones, not silently delete dated commitments the user made.
    """

    __tablename__ = "workspace_milestones"
    # Mirrors migration m002_enum_checks.
    __table_args__ = (
        CheckConstraint(
            "status IN ('upcoming', 'at_risk', 'hit', 'missed')",
            name="ck_workspace_milestones_status",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    goal_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("macro_goals.id", ondelete="SET NULL"), nullable=True, index=True),
    )

    title: str = Field(index=True)
    description: Optional[str] = None
    domain: Optional[str] = None
    due_date: Optional[date] = None
    status: str = Field(default="upcoming")  # upcoming, at_risk, hit, missed
    position: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))


class PlanBlock(SQLModel, table=True):
    """
    A time block on the weekly planner.

    Added 2026-08-01 for the redesign's Today -> Plan destination, which is a
    time-blocking planner. Note this is NOT the old /app/plan page — that was
    the goals/projects/sprints/tasks list, which moved under Workspace.

    Times are stored as local wall-clock `time` values, not timestamps: a block
    is "Tuesday 09:00–10:30 in the user's day", and storing it as an instant
    would make it drift when the user travels.
    """

    __tablename__ = "plan_blocks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    goal_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("macro_goals.id", ondelete="SET NULL"), nullable=True, index=True),
    )

    block_date: date = Field(index=True)
    start_time: time
    end_time: time
    title: str
    domain: Optional[str] = None
    # The single thing that must happen that day. At most one per date.
    is_priority: bool = Field(default=False)

    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(TIMESTAMP(timezone=True)))
