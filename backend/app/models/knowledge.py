import uuid
from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, Text, UniqueConstraint


class KnowledgeSource(SQLModel, table=True):
    """The user's external knowledge base (Obsidian vault folder or Notion workspace).

    One source per user. Pulled periodically into vault_files/vault_chunks so
    chat + agents can search it via RAG.
    """
    __tablename__ = "knowledge_sources"
    __table_args__ = (UniqueConstraint("user_id", name="uq_knowledge_source_user"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    source_type: str = Field(nullable=False)  # "obsidian" | "notion"
    config: Optional[Any] = Field(default=None, sa_column=Column(JSON))  # obsidian: {"path": ...}
    enabled: bool = Field(default=True, nullable=False)
    sync_interval_minutes: int = Field(default=30, nullable=False)
    last_synced_at: Optional[datetime] = None
    last_status: Optional[str] = None  # "ok" | "error"
    last_error: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
