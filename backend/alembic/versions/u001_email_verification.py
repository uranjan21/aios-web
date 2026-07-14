"""add email verification columns to users

Revision ID: u001_email_verification
Revises: w004_add_quote_favorite
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa

revision = "u001_email_verification"
down_revision = "w004_add_quote_favorite"
branch_labels = None
depends_on = None


def upgrade():
    # email_verified: default TRUE so all existing users are pre-verified.
    # Only new email signups after this migration start as unverified.
    op.add_column(
        "users",
        sa.Column(
            "email_verified",
            sa.Boolean,
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "users",
        sa.Column("email_verification_token", sa.String, nullable=True),
    )
    op.create_index(
        "ix_users_email_verification_token",
        "users",
        ["email_verification_token"],
    )


def downgrade():
    op.drop_index("ix_users_email_verification_token", table_name="users")
    op.drop_column("users", "email_verification_token")
    op.drop_column("users", "email_verified")
