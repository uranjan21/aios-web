import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text
from pgvector.sqlalchemy import Vector


class VaultFile(SQLModel, table=True):
    __tablename__ = "vault_files"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    path: str = Field(unique=True, nullable=False)
    area: Optional[str] = None
    file_type: str = Field(nullable=False)
    content: str = Field(sa_column=Column(Text, nullable=False))
    checksum: str = Field(nullable=False)
    sync_status: str = Field(default="ok", nullable=False)
    last_synced_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class VaultConflict(SQLModel, table=True):
    __tablename__ = "vault_conflicts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    file_id: uuid.UUID = Field(foreign_key="vault_files.id", nullable=False)
    app_content: str = Field(sa_column=Column(Text, nullable=False))
    vault_content: str = Field(sa_column=Column(Text, nullable=False))
    detected_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None


class VaultChunk(SQLModel, table=True):
    __tablename__ = "vault_chunks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    file_id: uuid.UUID = Field(foreign_key="vault_files.id", nullable=False)
    chunk_index: int = Field(nullable=False)
    content: str = Field(sa_column=Column(Text, nullable=False))
    embedding: Optional[List[float]] = Field(default=None, sa_column=Column(Vector(1536)))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
