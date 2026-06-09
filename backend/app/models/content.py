import uuid
from datetime import date, datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text


class ContentItem(SQLModel, table=True):
    __tablename__ = "content_items"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(nullable=False)
    platform: str = Field(nullable=False)
    status: str = Field(default="idea", nullable=False)
    idea_date: Optional[date] = None
    publish_date: Optional[date] = None
    content_type: Optional[str] = None
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
