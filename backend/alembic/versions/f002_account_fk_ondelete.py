"""Finance: give the account/category foreign keys a delete behaviour.

Every FK pointing at `finance_accounts.id` and `finance_categories.id` was
created with the SQLAlchemy default — NO ACTION — so Postgres refused the
parent DELETE and the API returned an unexplained 500. `delete_account` is a
bare `db.delete(account)`, which means the only realistic account (one with
transactions) could never be deleted. `delete_category` hand-clears
`finance_expenses` and `finance_income` only, so a pending row or a merchant
rule — both written automatically by the Gmail ingestion pipeline, outside
that router — blocked the delete without the user ever creating anything by
hand. Fixing it in the router would leave every other writer broken, so the
behaviour belongs on the constraint.

**Ten account references become `ON DELETE SET NULL`**: a ledger row survives
its account. The denormalized amount/category on the row is the record of what
happened; the account was only where it moved from.

**`finance_transfers.from_account_id` / `.to_account_id` become `RESTRICT`,
not SET NULL — a deliberate departure.** Both columns are NOT NULL and a
transfer with one side missing is not a degraded record, it is a meaningless
one: "moved ₹5,000 from nowhere". Widening them to nullable to accommodate a
delete would make every reader handle a state the domain does not have.
`delete_account` therefore raises an explicit 409 naming the transfer count
before it ever reaches the constraint; RESTRICT is the backstop for the
writers that do not go through that handler.

**Four category references become `ON DELETE SET NULL`.** Transactions already
carry the denormalized top-level category NAME, so losing the node id
degrades to "Uncategorized" rather than losing the record.

Revision ID: f002_account_fk_ondelete
Revises: c003
Create Date: 2026-08-16
"""
from typing import Optional, Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "f002_account_fk_ondelete"
down_revision: Union[str, None] = "c003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table, column, referred_table) — these FKs were created across six different
# migrations with three different naming conventions (explicit `fk_…` names,
# `op.create_foreign_key(None, …)` and inline `ForeignKeyConstraint`), so the
# real name is looked up from the catalog rather than guessed.
_ACCOUNT_FKS = [
    ("finance_expenses", "account_id"),
    ("finance_income", "account_id"),
    ("finance_bills", "account_id"),
    ("finance_loans", "account_id"),
    ("finance_pending_transactions", "account_id"),
    ("finance_merchant_rules", "account_id"),
    ("finance_cc_bills", "account_id"),
    ("finance_obligation_payments", "account_id"),
    ("finance_goal_contributions", "account_id"),
    ("finance_investment_transactions", "account_id"),
]

_CATEGORY_FKS = [
    ("finance_expenses", "category_id"),
    ("finance_income", "category_id"),
    ("finance_pending_transactions", "category_id"),
    ("finance_merchant_rules", "category_id"),
]

_TRANSFER_FKS = [
    ("finance_transfers", "from_account_id"),
    ("finance_transfers", "to_account_id"),
]


def _existing_fk_name(table: str, column: str, referred: str) -> Optional[str]:
    """The catalog name of the single-column FK on (table, column)."""
    inspector = sa.inspect(op.get_bind())
    for fk in inspector.get_foreign_keys(table):
        if fk.get("referred_table") == referred and fk.get("constrained_columns") == [column]:
            return fk.get("name")
    return None


def _respec(table: str, column: str, referred: str, ondelete: Optional[str]) -> None:
    """Drop whatever FK currently constrains (table, column) and recreate it
    under a deterministic name with the given ON DELETE behaviour."""
    old = _existing_fk_name(table, column, referred)
    if old:
        op.drop_constraint(old, table, type_="foreignkey")
    op.create_foreign_key(
        f"fk_{table}_{column}",
        table,
        referred,
        [column],
        ["id"],
        ondelete=ondelete,
    )


def upgrade() -> None:
    for table, column in _ACCOUNT_FKS:
        _respec(table, column, "finance_accounts", "SET NULL")
    for table, column in _TRANSFER_FKS:
        _respec(table, column, "finance_accounts", "RESTRICT")
    for table, column in _CATEGORY_FKS:
        _respec(table, column, "finance_categories", "SET NULL")


def downgrade() -> None:
    # Back to the SQLAlchemy default (NO ACTION). The names differed per
    # migration before this one; they are normalised on the way back too,
    # because the pre-f002 names are not recoverable from here.
    for table, column in _CATEGORY_FKS:
        _respec(table, column, "finance_categories", None)
    for table, column in _TRANSFER_FKS:
        _respec(table, column, "finance_accounts", None)
    for table, column in _ACCOUNT_FKS:
        _respec(table, column, "finance_accounts", None)
