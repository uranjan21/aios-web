import uuid
from datetime import date, datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, JSON


class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: Optional[str] = None
    tokens_used: int = Field(default=0, nullable=False)
    input_tokens: int = Field(default=0, nullable=False)
    output_tokens: int = Field(default=0, nullable=False)
    started_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    last_message_at: Optional[datetime] = None
    is_archived: bool = Field(default=False, nullable=False)


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="chat_sessions.id", nullable=False)
    role: str = Field(nullable=False)
    content: str = Field(sa_column=Column(Text, nullable=False))
    tool_calls: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    tool_results: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    tokens_used: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class DailyTokenUsage(SQLModel, table=True):
    __tablename__ = "daily_token_usage"

    usage_date: date = Field(primary_key=True, default_factory=date.today)
    tokens_used: int = Field(default=0, nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
