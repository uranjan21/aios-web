import uuid
from datetime import datetime
from typing import Optional, List

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON


class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True, nullable=False)
    # plan: free | pro | pro_plus | household
    plan: str = Field(default="free", nullable=False)
    # status: active | trialing | past_due | canceled | incomplete
    status: str = Field(default="active", nullable=False)
    stripe_customer_id: Optional[str] = Field(default=None, index=True)
    stripe_subscription_id: Optional[str] = Field(default=None, index=True)
    current_period_end: Optional[datetime] = None
    # addons: e.g. ["business", "content"]
    addons: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
