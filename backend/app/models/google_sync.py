import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, UniqueConstraint


class CalendarEvent(SQLModel, table=True):
    __tablename__ = "calendar_events"
    __table_args__ = (UniqueConstraint("user_id", "google_event_id", name="uq_calendar_user_event"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    google_event_id: str = Field(nullable=False)
    title: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = Field(default=None)
    status: str = Field(default="confirmed")
    html_link: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)  # naive UTC: columns are tz-naive
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)  # naive UTC: columns are tz-naive


class GmailMessage(SQLModel, table=True):
    __tablename__ = "gmail_messages"
    # gmail_id is only unique within one mailbox, so the key includes the
    # source account ("" for rows synced before multi-account support).
    __table_args__ = (UniqueConstraint("user_id", "account_email", "gmail_id", name="uq_gmail_user_account_message"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    account_email: str = Field(default="", nullable=False)
    gmail_id: str = Field(nullable=False)
    thread_id: Optional[str] = None
    subject: Optional[str] = Field(default=None, sa_column=Column(Text))
    sender: Optional[str] = None
    snippet: Optional[str] = Field(default=None, sa_column=Column(Text))
    # Full body text, fetched only for financial-matched messages (bank/UPI
    # alerts, statements) — the general sweep stays metadata-only.
    body_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_financial: bool = Field(default=False, nullable=False)
    # Set once the extraction agent has parsed this message (even if it yielded
    # zero transactions) — each email is LLM-processed exactly once.
    extracted_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    is_unread: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)  # naive UTC: columns are tz-naive
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)  # naive UTC: columns are tz-naive


class GoogleFitMetric(SQLModel, table=True):
    __tablename__ = "google_fit_metrics"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_fit_user_date"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    date: str = Field(nullable=False)
    steps: Optional[float] = None
    calories: Optional[float] = None
    distance_m: Optional[float] = None
    weight_kg: Optional[float] = None
    heart_rate_bpm: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)  # naive UTC: columns are tz-naive
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)  # naive UTC: columns are tz-naive
