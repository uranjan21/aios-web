import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


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
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
