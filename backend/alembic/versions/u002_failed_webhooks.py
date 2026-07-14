"""add failed_webhooks dead-letter table

Revision ID: u002_failed_webhooks
Revises: u001_email_verification
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa

revision = "u002_failed_webhooks"
down_revision = "u001_email_verification"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "failed_webhooks",
        sa.Column("id", sa.UUID(), nullable=False, primary_key=True),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("error", sa.Text(), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_failed_webhooks_event_id", "failed_webhooks", ["event_id"])
    op.create_index("ix_failed_webhooks_next_retry_at", "failed_webhooks", ["next_retry_at"])


def downgrade():
    op.drop_index("ix_failed_webhooks_next_retry_at", table_name="failed_webhooks")
    op.drop_index("ix_failed_webhooks_event_id", table_name="failed_webhooks")
    op.drop_table("failed_webhooks")
