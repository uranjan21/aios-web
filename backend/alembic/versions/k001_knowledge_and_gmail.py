"""knowledge sources + gmail messages + per-user vault path uniqueness

Revision ID: k001_knowledge_and_gmail
Revises: w004_add_quote_favorite
Create Date: 2026-07-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "k001_knowledge_and_gmail"
down_revision = "w004_add_quote_favorite"
branch_labels = None
depends_on = None

TZ = sa.DateTime(timezone=False)


def upgrade():
    op.create_table(
        "knowledge_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("source_type", sa.Text, nullable=False),
        sa.Column("config", sa.JSON),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("sync_interval_minutes", sa.Integer, nullable=False, server_default="30"),
        sa.Column("last_synced_at", TZ),
        sa.Column("last_status", sa.Text),
        sa.Column("last_error", sa.Text),
        sa.Column("created_at", TZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", TZ, nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", name="uq_knowledge_source_user"),
    )

    op.create_table(
        "gmail_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("gmail_id", sa.Text, nullable=False),
        sa.Column("thread_id", sa.Text),
        sa.Column("subject", sa.Text),
        sa.Column("sender", sa.Text),
        sa.Column("snippet", sa.Text),
        sa.Column("received_at", TZ),
        sa.Column("is_unread", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", TZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", TZ, nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "gmail_id", name="uq_gmail_user_message"),
    )

    # Vault file paths become per-user (knowledge sources are per-user).
    op.drop_constraint("vault_files_path_key", "vault_files", type_="unique")
    op.create_unique_constraint("uq_vault_files_user_path", "vault_files", ["user_id", "path"])


def downgrade():
    op.drop_constraint("uq_vault_files_user_path", "vault_files", type_="unique")
    op.create_unique_constraint("vault_files_path_key", "vault_files", ["path"])
    op.drop_table("gmail_messages")
    op.drop_table("knowledge_sources")
