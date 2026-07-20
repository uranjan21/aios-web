import uuid
from datetime import datetime, timezone
from typing import Optional, Any, List
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, ARRAY, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
import sqlalchemy as sa


class IntegrationCredential(SQLModel, table=True):
    __tablename__ = "integration_credentials"
    # One credential per (user, provider, account). Singleton providers (gcal,
    # gfit, notion, github) always use account_email="" — behavior unchanged.
    # Gmail may have N rows per user (one per linked Google account), since the
    # inbox receiving bank alerts is often NOT the sign-in account.
    __table_args__ = (
        UniqueConstraint("user_id", "provider", "account_email", name="uq_integration_user_provider_account"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    provider: str = Field(nullable=False)
    account_email: str = Field(default="", nullable=False)
    access_token_encrypted: Optional[str] = Field(default=None, sa_column=Column(Text))
    refresh_token_encrypted: Optional[str] = Field(default=None, sa_column=Column(Text))
    token_expires_at: Optional[datetime] = None
    status: str = Field(default="disconnected", nullable=False)
    scopes: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    metadata_: Optional[Any] = Field(default=None, sa_column=Column(JSON, name="metadata"))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
