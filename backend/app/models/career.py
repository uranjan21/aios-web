import uuid
from datetime import date, datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import CheckConstraint, Text, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID as PG_UUID


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
    __table_args__ = (UniqueConstraint("user_id", "skill_name", name="uq_skill_user_name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    skill_name: str = Field(nullable=False)
    category: str = Field(nullable=False)
    level: str = Field(nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    last_updated: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


# Job opportunity / application tracker
class JobOpportunity(SQLModel, table=True):
    __tablename__ = "job_opportunities"
    # Mirrors the CHECK in migration m002_enum_checks — the test suite builds
    # SQLite from this metadata, so a migration-only constraint isn't tested.
    __table_args__ = (
        CheckConstraint(
            "status IN ('prospect', 'applied', 'screening', 'interview', "
            "'offer', 'rejected', 'closed')",
            name="ck_job_opportunities_status",
        ),
    )

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


class CareerJournalEntry(SQLModel, table=True):
    """
    A written reflection, dated to a day.

    Added 2026-08-01 for the redesign's Career -> Journal destination. Distinct
    from CareerEvent, which records a THING THAT HAPPENED (promotion, talk,
    certification) — a journal entry records what the user made of it.

    `tags` is a comma-separated list derived on write from the entry body. It
    is deliberately keyword-derived rather than LLM-tagged: every other LLM
    call site in this codebase is metered against the AI quota, and a tagging
    pass on every keystroke-to-save is not worth a credit. Revisit only if the
    keyword list proves too blunt.
    """

    __tablename__ = "career_journal_entries"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    entry_date: date = Field(nullable=False, index=True)
    body: str = Field(sa_column=Column(Text, nullable=False))
    title: Optional[str] = Field(default=None)
    tags: Optional[str] = Field(default=None)
    word_count: int = Field(default=0, nullable=False)
    # Explicit TIMESTAMPTZ — the defaults below are tz-aware, and a naive
    # column makes asyncpg reject every insert.
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(TIMESTAMP(timezone=True), nullable=False),
    )


class LearningResource(SQLModel, table=True):
    """A course, book, article or video being worked through.

    Added 2026-08-04. Career could record that learning HAPPENED — as a
    `CareerEvent` with `event_type="learning"`, a dated line of text — but not
    what was being learned, how far through it you were, or whether it ever
    finished. So "which things am I learning" had no answer beyond prose.

    `skill_id` is the point of the model. `SkillInventory.level` already has a
    `day_0` rung meaning "want to learn"; linking a resource to that row turns
    a gap into a plan, and is what lets the Skills page say what is being done
    about each gap instead of just naming it.
    """

    __tablename__ = "career_learning_resources"
    # Mirrors migration m002_enum_checks.
    __table_args__ = (
        CheckConstraint(
            "status IN ('planned', 'in_progress', 'completed', 'abandoned')",
            name="ck_career_learning_resources_status",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    title: str = Field(nullable=False)
    kind: str = Field(default="course", nullable=False)  # course/book/article/video/other
    provider: Optional[str] = Field(default=None)        # Udemy, O'Reilly, YouTube…
    url: Optional[str] = Field(default=None)
    # planned | in_progress | completed | abandoned. "abandoned" is deliberate:
    # dropping a course is a real outcome, and forcing it to stay
    # "in_progress" forever makes the list useless.
    status: str = Field(default="planned", nullable=False)
    progress_pct: int = Field(default=0, nullable=False)
    # SET NULL, not CASCADE: deleting a skill must not delete the record of
    # having studied for it.
    skill_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("skill_inventory.id", ondelete="SET NULL"), nullable=True, index=True),
    )
    started_at: Optional[date] = Field(default=None)
    completed_at: Optional[date] = Field(default=None)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class EmploymentRole(SQLModel, table=True):
    """One job: company, title, and when it ran.

    Career had no employment model at all, so job history, titles and tenure
    lived nowhere — the CV facts the area exists to track were the facts it
    could not hold.

    `end_date IS NULL` means CURRENT. That is the one representation; there is
    no separate `is_current` flag, because two sources of truth for "am I
    still there" drift the moment one is updated without the other.
    """

    __tablename__ = "career_employment_roles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    company: str = Field(nullable=False)
    title: str = Field(nullable=False)
    employment_type: str = Field(default="full_time", nullable=False)  # full_time/contract/freelance/internship
    location: Optional[str] = Field(default=None)
    start_date: date = Field(nullable=False)
    end_date: Optional[date] = Field(default=None)  # NULL = current role
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
