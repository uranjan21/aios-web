import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, JSON

def _default_auto_commit() -> datetime:
    return datetime.utcnow() + timedelta(hours=24)

class AgentAction(SQLModel, table=True):
    __tablename__ = "agent_actions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    source_domain: str = Field(nullable=False) # e.g. health, finance, career
    action_type: str = Field(nullable=False) # e.g. calendar_block, draft_email
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
    status: str = Field(default="pending", nullable=False) # pending, approved, executed, rejected
    ai_explanation: Optional[str] = Field(default=None, sa_column=Column(Text))
    auto_commit_at: datetime = Field(default_factory=_default_auto_commit, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
