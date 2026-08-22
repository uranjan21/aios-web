import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, UniqueConstraint, ForeignKey
import sqlalchemy as sa


class UserApiKey(SQLModel, table=True):
    """A user's own LLM provider credential — the whole basis of BYOK.

    Control Tower makes no LLM calls on its own account: every request is billed
    to the key its owner pasted here, which is what lets the product be free and
    uncapped. A user with no row for a provider simply cannot use that provider,
    and the call sites raise `UserApiKeyMissing` rather than silently falling
    back to an instance key (that fallback is precisely the uncapped-spend hole
    the 2026-08-16 audit flagged).

    The secret is Fernet-encrypted at rest with the same TOKEN_ENCRYPTION_KEY
    that protects the Google OAuth tokens in `integration_credentials`. It is
    NEVER returned to the client — `key_hint` exists so the UI can show
    "sk-…4f2a" and let someone confirm which key is installed without exposing
    it.
    """

    __tablename__ = "user_api_keys"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_api_key_provider"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        sa_column=Column(
            sa.Uuid(),
            ForeignKey("users.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        )
    )
    # "openai" | "anthropic" — validated in the API layer against
    # core.llm_models, and constrained at the DB level by the migration.
    provider: str = Field(nullable=False)
    key_encrypted: str = Field(sa_column=Column(Text, nullable=False))
    # Last 4 characters only, for display. Never enough to reconstruct the key.
    key_hint: str = Field(default="", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
