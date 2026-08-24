"""Retire the saved-quotes feature.

The router, the model and the `saved_quotes` table are removed together.

History: the only consumers were `GreetingHero` and `SavedQuotesCard`, both of
which stopped being rendered in an earlier redesign. The 2026-08-16 audit found
them unimported and deleted them, which is what made the routes scan as
orphaned; they were then parked in `test_api_mappings.ignored_routes` on
2026-08-17 with an explicit note not to leave the entry there forever. This is
that decision, taken on 2026-08-23 with the owner's sign-off.

THIS DROPS USER DATA. Whatever quotes anyone saved go with the table, and
`downgrade()` can only rebuild the empty shell — the rows are not recoverable
from here. Take a dump first if that matters.

Revision ID: u002_drop_saved_quotes
Revises: u001_user_onboarded_at
Create Date: 2026-08-23
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "u002_drop_saved_quotes"
down_revision = "u001_user_onboarded_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("saved_quotes")


def downgrade() -> None:
    # Restores the STRUCTURE only. The rows dropped above are gone.
    op.create_table(
        "saved_quotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("author", sa.String(length=200), nullable=True),
        sa.Column("favorite", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "saved_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_saved_quotes_user_id", "saved_quotes", ["user_id"])
