"""Extend users table for multi-auth SaaS

Revision ID: g002
Revises: g001
Create Date: 2026-06-21 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "g002"
down_revision = "g001"
branch_labels = None
depends_on = None

TZ = sa.TIMESTAMP(timezone=True)


def upgrade() -> None:
    op.add_column("users", sa.Column("picture_url", sa.Text, nullable=True))
    op.add_column(
        "users", sa.Column("auth_provider", sa.Text, nullable=False, server_default="email")
    )
    op.add_column("users", sa.Column("updated_at", TZ, nullable=False, server_default=sa.text("now()")))

    op.alter_column("users", "password_hash", existing_type=sa.VARCHAR(), nullable=True)

    op.alter_column(
        "users",
        "created_at",
        existing_type=sa.DateTime(),
        type_=TZ,
        existing_nullable=False,
        server_default=sa.text("now()"),
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "created_at",
        existing_type=TZ,
        type_=sa.DateTime(),
        existing_nullable=False,
    )
    op.alter_column("users", "password_hash", existing_type=sa.VARCHAR(), nullable=False)
    op.drop_column("users", "updated_at")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "picture_url")
