"""merge the u-branch (email verification) and p-branch (finance indexes) heads

u001_email_verification was branched off w004_add_quote_favorite, which already
had k001_knowledge_and_gmail as a child — leaving two live heads and breaking
`alembic upgrade head` (singular) in entrypoint.sh. This empty merge revision
re-unifies the chain.

Revision ID: m001_merge_verification_heads
Revises: u002_failed_webhooks, p001_finance_composite_indexes
Create Date: 2026-07-19
"""

revision = "m001_merge_verification_heads"
down_revision = ("u002_failed_webhooks", "p001_finance_composite_indexes")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
