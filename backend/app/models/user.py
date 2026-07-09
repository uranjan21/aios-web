import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text


def _utcnow() -> datetime:
    return datetime.utcnow()


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, nullable=False, index=True)
    name: str = Field(nullable=False)
    picture_url: Optional[str] = Field(default=None)
    auth_provider: str = Field(default="email")
    password_hash: Optional[str] = Field(default=None)
    token_version: int = Field(default=1, nullable=False)
    is_admin: bool = Field(default=False, nullable=False)
    
    # LLM Settings
    llm_provider: Optional[str] = Field(default=None)  # "system", "openai", "anthropic"
    openai_chat_model: Optional[str] = Field(default=None)
    claude_model: Optional[str] = Field(default=None)
    
    openai_api_key_encrypted: Optional[str] = Field(default=None, sa_column=Column(Text))
    anthropic_api_key_encrypted: Optional[str] = Field(default=None, sa_column=Column(Text))

    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
