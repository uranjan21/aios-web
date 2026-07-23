"""add password reset token columns

Mirrors the email-verification contract: only the sha256 of the emailed token is
stored, and sent_at drives the (1 hour) expiry window.

Revision ID: v001_password_reset
Revises: t001_txn_tracker_gmail
Create Date: 2026-07-22
"""

from alembic import op
import sqlalchemy as sa

revision = "v001_password_reset"
down_revision = "t001_txn_tracker_gmail"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("password_reset_token", sa.String(), nullable=True))
    op.add_column("users", sa.Column("password_reset_sent_at", sa.DateTime(), nullable=True))
    op.create_index("ix_users_password_reset_token", "users", ["password_reset_token"])


def downgrade():
    op.drop_index("ix_users_password_reset_token", table_name="users")
    op.drop_column("users", "password_reset_sent_at")
    op.drop_column("users", "password_reset_token")
