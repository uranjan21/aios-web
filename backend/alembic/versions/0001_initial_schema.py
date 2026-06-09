"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text, unique=True, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "vault_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("path", sa.Text, unique=True, nullable=False),
        sa.Column("area", sa.Text),
        sa.Column("file_type", sa.Text, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("checksum", sa.Text, nullable=False),
        sa.Column("sync_status", sa.Text, nullable=False, server_default="ok"),
        sa.Column("last_synced_at", sa.TIMESTAMPTZ),
        sa.Column("error_message", sa.Text),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("sync_status IN ('ok','syncing','conflict','error','missing')", name="vault_files_sync_status_check"),
    )

    op.create_table(
        "vault_conflicts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vault_files.id"), nullable=False),
        sa.Column("app_content", sa.Text, nullable=False),
        sa.Column("vault_content", sa.Text, nullable=False),
        sa.Column("detected_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("resolved_at", sa.TIMESTAMPTZ),
        sa.Column("resolution", sa.Text),
    )

    op.create_table(
        "vault_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vault_files.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("embedding", sa.Column("embedding", sa.Text)),  # will be vector(1536) via raw SQL
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("file_id", "chunk_index"),
    )
    # pgvector column needs raw SQL
    op.execute("ALTER TABLE vault_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536)")
    op.execute("CREATE INDEX IF NOT EXISTS vault_chunks_embedding_idx ON vault_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")

    op.create_table(
        "finance_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("snapshot_month", sa.Date, unique=True, nullable=False),
        sa.Column("salary", sa.Numeric(12, 2)),
        sa.Column("take_home", sa.Numeric(12, 2)),
        sa.Column("net_worth", sa.Numeric(12, 2)),
        sa.Column("cc_debt", sa.Numeric(12, 2)),
        sa.Column("emergency_fund", sa.Numeric(12, 2)),
        sa.Column("total_expenses", sa.Numeric(12, 2)),
        sa.Column("notes", sa.Text),
        sa.Column("is_estimated", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("source", sa.Text, nullable=False, server_default="vault_sync"),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "finance_expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("logged_at", sa.TIMESTAMPTZ, nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("category", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("source", sa.Text, nullable=False, server_default="agent"),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "health_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("logged_at", sa.TIMESTAMPTZ, nullable=False),
        sa.Column("entry_type", sa.Text, nullable=False),
        sa.Column("value", sa.Numeric(8, 2)),
        sa.Column("unit", sa.Text),
        sa.Column("notes", sa.Text),
        sa.Column("source", sa.Text, nullable=False, server_default="agent"),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("entry_type IN ('gym','weight','food','water','body_fat','note')", name="health_logs_entry_type_check"),
    )

    op.create_table(
        "career_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("occurred_at", sa.TIMESTAMPTZ, nullable=False),
        sa.Column("event_type", sa.Text, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("skill", sa.Text),
        sa.Column("skill_level", sa.Text),
        sa.Column("source", sa.Text, nullable=False, server_default="agent"),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "skill_inventory",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("skill_name", sa.Text, unique=True, nullable=False),
        sa.Column("category", sa.Text, nullable=False),
        sa.Column("level", sa.Text, nullable=False),
        sa.Column("notes", sa.Text),
        sa.Column("last_updated", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "business_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("occurred_at", sa.TIMESTAMPTZ, nullable=False),
        sa.Column("product", sa.Text, nullable=False, server_default="ledgr"),
        sa.Column("event_type", sa.Text, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("mrr", sa.Numeric(10, 2)),
        sa.Column("source", sa.Text, nullable=False, server_default="agent"),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "content_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("platform", sa.Text, nullable=False),
        sa.Column("status", sa.Text, nullable=False, server_default="idea"),
        sa.Column("idea_date", sa.Date),
        sa.Column("publish_date", sa.Date),
        sa.Column("content_type", sa.Text),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "chat_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.Text),
        sa.Column("tokens_used", sa.Integer, nullable=False, server_default="0"),
        sa.Column("input_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("started_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("last_message_at", sa.TIMESTAMPTZ),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Text, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("tool_calls", postgresql.JSONB),
        sa.Column("tool_results", postgresql.JSONB),
        sa.Column("tokens_used", sa.Integer),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("chat_messages_session_created", "chat_messages", ["session_id", "created_at"])

    op.create_table(
        "daily_token_usage",
        sa.Column("usage_date", sa.Date, primary_key=True, server_default=sa.text("CURRENT_DATE")),
        sa.Column("tokens_used", sa.Integer, nullable=False, server_default="0"),
        sa.Column("updated_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "integration_credentials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("provider", sa.Text, unique=True, nullable=False),
        sa.Column("access_token_encrypted", sa.Text),
        sa.Column("refresh_token_encrypted", sa.Text),
        sa.Column("token_expires_at", sa.TIMESTAMPTZ),
        sa.Column("status", sa.Text, nullable=False, server_default="disconnected"),
        sa.Column("scopes", postgresql.JSONB),
        sa.Column("metadata", postgresql.JSONB),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "agents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("task_id", sa.Text, unique=True, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("cron_expression", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_run_at", sa.TIMESTAMPTZ),
        sa.Column("last_run_status", sa.Text),
        sa.Column("last_output_path", sa.Text),
        sa.Column("run_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMPTZ, nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    for table in [
        "agents", "integration_credentials", "daily_token_usage",
        "chat_messages", "chat_sessions", "content_items", "business_events",
        "skill_inventory", "career_events", "health_logs", "finance_expenses",
        "finance_snapshots", "vault_chunks", "vault_conflicts", "vault_files", "users"
    ]:
        op.drop_table(table)
