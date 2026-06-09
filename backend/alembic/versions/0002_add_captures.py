"""Add captures table

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

TZ = sa.TIMESTAMP(timezone=True)


def upgrade() -> None:
    op.create_table(
        "captures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("raw_text", sa.Text, nullable=False),
        sa.Column("processed", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", TZ, nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_captures_created_at", "captures", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_captures_created_at", "captures")
    op.drop_table("captures")
