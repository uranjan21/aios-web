"""add favorite flag to saved_quotes

Revision ID: w004_add_quote_favorite
Revises: w003_add_saved_quotes
Create Date: 2026-07-07
"""

from alembic import op
import sqlalchemy as sa

revision = "w004_add_quote_favorite"
down_revision = "w003_add_saved_quotes"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "saved_quotes",
        sa.Column("favorite", sa.Boolean, nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column("saved_quotes", "favorite")
