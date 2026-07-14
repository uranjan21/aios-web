import uuid
from datetime import datetime
from typing import Optional, List

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON, Text


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
    # addons: e.g. ["business", "content"] — DEPRECATED, kept for transition/back-compat.
    addons: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    # ── Modular model (Phase 1): the source of truth for entitlement ──────────
    # modules: owned module keys, e.g. ["finance", "chat"]. `bundle=True` grants
    # all modules. `free_area`: the single area unlocked for free.
    modules: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    bundle: bool = Field(default=False, nullable=False)
    free_area: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class AIUsageRecord(SQLModel, table=True):
    """One row per metered AI action (a chat message, an agent run, an insight).
    Aggregated per calendar month for quota; unreported rows are batched to
    Stripe's metered usage by an APScheduler job (Phase 2)."""
    __tablename__ = "ai_usage_records"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    ts: datetime = Field(default_factory=datetime.utcnow, index=True, nullable=False)
    units: int = Field(default=1, nullable=False)
    source: str = Field(default="chat", nullable=False)  # chat | agents | insights
    reported_to_stripe: bool = Field(default=False, nullable=False)


class FailedWebhook(SQLModel, table=True):
    """Stripe webhook events that failed processing — retried by the scheduler."""
    __tablename__ = "failed_webhooks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_id: str = Field(index=True)
    event_type: str = Field()
    payload: str = Field(sa_column=Column(Text))
    error: str = Field(sa_column=Column(Text))
    retry_count: int = Field(default=0)
    next_retry_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
