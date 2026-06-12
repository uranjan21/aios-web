"""Web-push subscription storage — one row per browser/device subscription."""
import uuid
from datetime import datetime

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel


class PushSubscription(SQLModel, table=True):
    __tablename__ = "push_subscriptions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    endpoint: str = Field(sa_column=Column(Text, nullable=False, unique=True))
    p256dh: str = Field(nullable=False)
    auth: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
