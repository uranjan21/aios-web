import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, ForeignKey, Text, String
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
    saved_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(TIMESTAMP(timezone=True), server_default="now()")
    )
