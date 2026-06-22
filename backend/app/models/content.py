import uuid
from datetime import date, datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, UniqueConstraint


class ContentCampaign(SQLModel, table=True):
    """A campaign / series that groups related content items together."""
    __tablename__ = "content_campaigns"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_campaign_user_name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    goal: Optional[str] = Field(default=None)
    color: str = Field(default="#CA8A04", nullable=False)
    status: str = Field(default="active", nullable=False)  # active/completed/archived
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class ContentItem(SQLModel, table=True):
    __tablename__ = "content_items"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    title: str = Field(nullable=False)
    platform: str = Field(nullable=False)
    status: str = Field(default="idea", nullable=False)  # idea/in_progress/scheduled/published/archived
    content_type: Optional[str] = None  # post/thread/article/video/reel/short/newsletter
    priority: str = Field(default="medium", nullable=False)  # low/medium/high

    # Body + organisation
    body: Optional[str] = Field(default=None, sa_column=Column(Text))
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    tags: Optional[str] = None  # comma-separated freeform labels
    pillar: Optional[str] = None  # content pillar / theme
    campaign_id: Optional[uuid.UUID] = Field(default=None, foreign_key="content_campaigns.id", index=True)
    position: int = Field(default=0, nullable=False)  # ordering within a status column

    # Scheduling
    idea_date: Optional[date] = None
    publish_date: Optional[date] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    url: Optional[str] = None  # live URL once published

    # Engagement metrics (manually logged or synced from integrations later)
    views: int = Field(default=0, nullable=False)
    likes: int = Field(default=0, nullable=False)
    comments: int = Field(default=0, nullable=False)
    shares: int = Field(default=0, nullable=False)

    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
