import uuid
import datetime as dt
from typing import Optional, Dict, Any

from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB

def _utcnow() -> dt.datetime:
    return dt.datetime.utcnow()

class AutomationRule(SQLModel, table=True):
    __tablename__ = "automation_rules"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    template_key: str = Field(nullable=False, index=True)
    enabled: bool = Field(default=True, nullable=False)
    params: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    last_fired_at: Optional[dt.datetime] = Field(default=None)
    created_at: dt.datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: dt.datetime = Field(default_factory=_utcnow, nullable=False)
