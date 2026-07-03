import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field
from typing import Optional

class AdminAuditLog(SQLModel, table=True):
    __tablename__ = "admin_audit_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    admin_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    action: str = Field(index=True)
    target_user_id: Optional[uuid.UUID] = Field(default=None, index=True)
    details: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
