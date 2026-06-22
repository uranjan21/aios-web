import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class OAuthState(SQLModel, table=True):
    __tablename__ = "oauth_states"

    state: str = Field(primary_key=True, max_length=128)
    provider: str = Field(nullable=False, max_length=32)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    user_id: Optional[uuid.UUID] = Field(default=None, nullable=True, foreign_key="users.id")
