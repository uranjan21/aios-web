import uuid
from datetime import date, datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import TIMESTAMP


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
