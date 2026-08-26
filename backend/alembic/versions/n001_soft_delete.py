"""Soft delete on the financially significant ledger tables.

S17 of the 2026-08-16 audit: the schema carried **zero** `deleted_at` columns.
Deleting an expense was a hard `DELETE` that also mutated
`finance_accounts.balance`, so there was no undo, no audit trail, and no way to
answer "where did that transaction go?" for a product whose subject is money.

**Scope is deliberate.** Six tables get the column:
`finance_expenses`, `finance_income`, `finance_transfers`, `finance_bills`,
`finance_loans`, `finance_investments`.

`finance_accounts` and `finance_categories` are deliberately EXCLUDED. A
soft-deleted account would make every balance ambiguous (the balance is a cached
denormalisation of the ledger, and "deleted but still holding money" has no
answer), and both already got the correct `ON DELETE SET NULL` detach behaviour
in `f002_account_fk_ondelete`. `finance_pending_transactions` is also excluded:
rows there already leave the queue via `status` ∈ {approved, dismissed} — a
second deletion axis on the same lifecycle would be two sources of truth.

**No uniqueness interaction.** None of the six tables carries a unique
constraint (checked against the live schema, not assumed), so a soft-deleted row
cannot block re-creating its replacement. The one dedupe key in the area,
`finance_pending_transactions.uq_pending_user_email`, is on a table this
migration does not touch.

The column is indexed on each table because every read path in the finance
router and in `services/finance/**` now filters on it.

Revision ID: n001_soft_delete
Revises: m002_enum_checks
Create Date: 2026-08-23
"""
from alembic import op
import sqlalchemy as sa

revision = "n001_soft_delete"
down_revision = "m002_enum_checks"
branch_labels = None
depends_on = None


TABLES = (
    "finance_expenses",
    "finance_income",
    "finance_transfers",
    "finance_bills",
    "finance_loans",
    "finance_investments",
)


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("deleted_at", sa.DateTime(), nullable=True))
        op.create_index(f"ix_{table}_deleted_at", table, ["deleted_at"])


def downgrade() -> None:
    # Rows soft-deleted while this revision was applied become live again on
    # downgrade — the column that hid them is gone. That is the honest outcome:
    # the alternative is physically deleting user data during a schema rollback.
    for table in TABLES:
        op.drop_index(f"ix_{table}_deleted_at", table_name=table)
        op.drop_column(table, "deleted_at")
