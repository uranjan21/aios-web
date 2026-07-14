"""Add per-agent timezone so crons fire in the user's local time.

Agent crons were all interpreted as UTC, so "06:00" ran at 11:30 IST. Each
agent now carries an IANA tz; the scheduler registers CronTrigger with it.
Backfill existing agents from the user's BriefingPreference.tz when set.

Revision ID: ag01_agent_timezone
Revises: 083a9f4c2477
"""
from alembic import op
import sqlalchemy as sa


revision = "ag01_agent_timezone"
down_revision = "083a9f4c2477"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "agents",
        sa.Column("tz", sa.Text(), nullable=False, server_default="UTC"),
    )
    # Backfill from the user's briefing preference where one exists.
    op.execute(
        """
        UPDATE agents a
        SET tz = bp.tz
        FROM briefing_preferences bp
        WHERE bp.user_id = a.user_id
          AND bp.tz IS NOT NULL
          AND bp.tz <> ''
        """
    )


def downgrade() -> None:
    op.drop_column("agents", "tz")
