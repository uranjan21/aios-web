"""Career journal entries — dated written reflections.

Backs the redesign's Career -> Journal destination. Separate from
`career_events`, which records what happened rather than what the user made
of it.

Revision ID: c002_career_journal
Revises: w005_workspace_milestones
Create Date: 2026-08-01
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "c002_career_journal"
down_revision = "w005_workspace_milestones"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "career_journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("tags", sa.String(), nullable=True),
        sa.Column("word_count", sa.Integer(), nullable=False, server_default="0"),
        # TIMESTAMPTZ, not naive DateTime: the model defaults are
        # datetime.now(timezone.utc), and asyncpg refuses to bind a tz-aware
        # value to a naive column ("can't subtract offset-naive and
        # offset-aware datetimes"). Same trap the finance logged_at columns hit.
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False),
    )
    op.create_index("ix_career_journal_entries_user_id", "career_journal_entries", ["user_id"])
    op.create_index("ix_career_journal_entries_entry_date", "career_journal_entries", ["entry_date"])
    # The list view is always "this user's entries, newest first".
    op.create_index(
        "ix_career_journal_user_date", "career_journal_entries", ["user_id", "entry_date"]
    )


def downgrade() -> None:
    op.drop_index("ix_career_journal_user_date", table_name="career_journal_entries")
    op.drop_index("ix_career_journal_entries_entry_date", table_name="career_journal_entries")
    op.drop_index("ix_career_journal_entries_user_id", table_name="career_journal_entries")
    op.drop_table("career_journal_entries")
