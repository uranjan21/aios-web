"""add email_verification_sent_at for token expiry

Tokens are now stored as sha256 hashes and expire 24h after this timestamp.
Existing plaintext tokens become unmatchable — affected (unverified) users
simply request a new link via /auth/resend-verification.

Revision ID: u003_verification_sent_at
Revises: m001_merge_verification_heads
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa

revision = "u003_verification_sent_at"
down_revision = "m001_merge_verification_heads"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verification_sent_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("users", "email_verification_sent_at")
