import uuid
from datetime import datetime, timezone
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)


class GmailMessage(SQLModel, table=True):
    __tablename__ = "gmail_messages"
    __table_args__ = (UniqueConstraint("user_id", "gmail_id", name="uq_gmail_user_message"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    gmail_id: str = Field(nullable=False)
    thread_id: Optional[str] = None
    subject: Optional[str] = Field(default=None, sa_column=Column(Text))
    sender: Optional[str] = None
    snippet: Optional[str] = Field(default=None, sa_column=Column(Text))
    received_at: Optional[datetime] = None
    is_unread: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)


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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
