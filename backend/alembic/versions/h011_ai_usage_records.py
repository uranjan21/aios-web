"""Metered AI: ai_usage_records table (Phase 2)

Revision ID: h011
Revises: h010
Create Date: 2026-06-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h011"
down_revision: Union[str, None] = "h010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_records",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ts", sa.DateTime(), nullable=False),
        sa.Column("units", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("source", sa.String(), nullable=False, server_default="chat"),
        sa.Column("reported_to_stripe", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_ai_usage_records_user_id", "ai_usage_records", ["user_id"])
    op.create_index("ix_ai_usage_records_ts", "ai_usage_records", ["ts"])


def downgrade() -> None:
    op.drop_index("ix_ai_usage_records_ts", table_name="ai_usage_records")
    op.drop_index("ix_ai_usage_records_user_id", table_name="ai_usage_records")
    op.drop_table("ai_usage_records")
