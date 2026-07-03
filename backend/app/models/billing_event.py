import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field

class StripeEventIdempotency(SQLModel, table=True):
    __tablename__ = "stripe_event_idempotency"

    event_id: str = Field(primary_key=True, index=True)
    processed_at: datetime = Field(default_factory=datetime.utcnow)
