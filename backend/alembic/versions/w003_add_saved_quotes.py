"""add saved_quotes table

Revision ID: w003_add_saved_quotes
Revises: w002_workspace_field_expansion
Create Date: 2026-07-06
"""

from alembic import op
import sqlalchemy as sa

revision = "w003_add_saved_quotes"
down_revision = "w002_workspace_field_expansion"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "saved_quotes",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("author", sa.String(200), nullable=True),
        sa.Column("saved_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("saved_quotes")
