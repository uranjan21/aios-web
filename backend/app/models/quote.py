import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, ForeignKey, Text, String, text as sa_text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID as PG_UUID


class SavedQuote(SQLModel, table=True):
    __tablename__ = "saved_quotes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    text: str = Field(sa_column=Column(Text, nullable=False))
    author: Optional[str] = Field(default=None, sa_column=Column(String(200)))
    favorite: bool = Field(default=False, nullable=False)
    # Naive UTC, matching every other timestamp in the schema (migration
    # n002_timestamp_normalisation). The server default is spelled
    # `timezone('utc', now())` rather than `now()` because a bare `now()` is
    # TIMESTAMPTZ and would be cast using the session's TimeZone setting.
    saved_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(TIMESTAMP, server_default=sa_text("(timezone('utc', now()))"))
    )
