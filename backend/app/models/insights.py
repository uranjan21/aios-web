import uuid
import datetime as dt
from typing import Optional, Dict, Any

from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB

def _utcnow() -> dt.datetime:
    return dt.datetime.utcnow()

class BriefingPreference(SQLModel, table=True):
    __tablename__ = "briefing_preferences"

    user_id: uuid.UUID = Field(primary_key=True, foreign_key="users.id")
    enabled: bool = Field(default=True, nullable=False)
    deliver_at: dt.time = Field(nullable=False)
    channels: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    tz: str = Field(default="UTC", nullable=False)


class Briefing(SQLModel, table=True):
    __tablename__ = "briefings"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    date: dt.date = Field(nullable=False, index=True)
    content_md: str = Field(nullable=False)
    facts: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    created_at: dt.datetime = Field(default_factory=_utcnow, nullable=False)


class Insight(SQLModel, table=True):
    __tablename__ = "insights"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    kind: str = Field(default="correlation", nullable=False)
    title: str = Field(nullable=False)
    body: str = Field(nullable=False)
    metric_a: str = Field(nullable=False)
    metric_b: str = Field(nullable=False)
    r: float = Field(nullable=False)
    n: int = Field(nullable=False)
    lag: int = Field(default=0, nullable=False)
    score: float = Field(nullable=False)
    status: str = Field(default="new", nullable=False)  # 'new', 'kept', 'dismissed'
    feedback: Optional[int] = Field(default=None)
    created_at: dt.datetime = Field(default_factory=_utcnow, nullable=False)
