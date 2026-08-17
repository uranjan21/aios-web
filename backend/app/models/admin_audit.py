import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from typing import Optional

class AdminAuditLog(SQLModel, table=True):
    __tablename__ = "admin_audit_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    # SET NULL, not CASCADE: an audit trail that erases itself when the actor's
    # account is deleted is not an audit trail. NOT NULL here was what made the
    # GDPR erasure path roll back for any user who had ever acted as admin.
    # The actor's identity is meant to survive in `details`.
    admin_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
    )
    action: str = Field(index=True)
    target_user_id: Optional[uuid.UUID] = Field(default=None, index=True)
    details: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
