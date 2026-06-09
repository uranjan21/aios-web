"""Add last_output_text to agents

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-09
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("agents", sa.Column("last_output_text", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("agents", "last_output_text")
