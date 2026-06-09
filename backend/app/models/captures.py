import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text


class Capture(SQLModel, table=True):
    __tablename__ = "captures"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    raw_text: str = Field(sa_column=Column(Text, nullable=False))
    processed: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
