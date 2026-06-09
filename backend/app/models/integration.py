import uuid
from datetime import datetime, timezone
from typing import Optional, Any, List
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, ARRAY, Text
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
import sqlalchemy as sa


class IntegrationCredential(SQLModel, table=True):
    __tablename__ = "integration_credentials"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    provider: str = Field(unique=True, nullable=False)
    access_token_encrypted: Optional[str] = Field(default=None, sa_column=Column(Text))
    refresh_token_encrypted: Optional[str] = Field(default=None, sa_column=Column(Text))
    token_expires_at: Optional[datetime] = None
    status: str = Field(default="disconnected", nullable=False)
    scopes: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    metadata_: Optional[Any] = Field(default=None, sa_column=Column(JSON, name="metadata"))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
