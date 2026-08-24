"""Persist onboarding completion on the user.

Completion lived in `localStorage.ct_onboarded`, so the welcome flow reappeared
on every new device, browser and incognito window, and the activation event the
product funnel is defined on was never recorded anywhere the server could see.

NULL means "has not finished onboarding". Existing rows are deliberately left
NULL rather than backfilled to `now()`: the flow they skipped was four slides of
marketing copy, and the one replacing it actually does something (pick an area,
connect Gmail, log an entry), so established users are worth offering it once.

Revision ID: u001_user_onboarded_at
Revises: p002_hot_path_composites
Create Date: 2026-08-23
"""
import sqlalchemy as sa
from alembic import op

revision = "u001_user_onboarded_at"
down_revision = "p002_hot_path_composites"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("onboarded_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "onboarded_at")
