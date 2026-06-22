"""Web-push subscription storage — one row per (user, browser) subscription."""
import uuid
from datetime import datetime

from sqlalchemy import Column, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


class PushSubscription(SQLModel, table=True):
    __tablename__ = "push_subscriptions"
    __table_args__ = (UniqueConstraint("user_id", "endpoint", name="uq_push_user_endpoint"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    endpoint: str = Field(sa_column=Column(Text, nullable=False))
    p256dh: str = Field(nullable=False)
    auth: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
