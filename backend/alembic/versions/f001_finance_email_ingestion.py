"""Finance OS — email ingestion, merchant rules, CC bills, obligation payments.

Chains after main's head (ag02_deactivate_content_agent). Purely additive: it adds columns
distinct from main's t001 tracker columns, so the two ingestion schemas coexist.

Adds:
  - finance_pending_transactions.source_email_id / raw_text / parser (idempotent ingestion)
  - unique (user_id, source_email_id) on finance_pending_transactions
  - finance_investments.committed_monthly (SIP commitment vs actual)
  - finance_merchant_rules            (auto-categorisation)
  - finance_cc_bills                  (credit-card statement payables)
  - finance_obligation_payments       (per-month paid state for the payables checklist)

Revision ID: f001_finance_email_ingestion
Revises: u002_failed_webhooks, p001_finance_composite_indexes
Create Date: 2026-07-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "f001_finance_email_ingestion"
# Chain after main's head (main's m001 already merged the two old finance/webhook heads).
down_revision: Union[str, Sequence[str], None] = "ag02_deactivate_content_agent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── finance_pending_transactions: idempotent email ingestion ──────────────
    op.add_column(
        "finance_pending_transactions",
        sa.Column("source_email_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "finance_pending_transactions",
        sa.Column("raw_text", sa.Text(), nullable=True),
    )
    op.add_column(
        "finance_pending_transactions",
        sa.Column("parser", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.create_index(
        "ix_finance_pending_transactions_source_email_id",
        "finance_pending_transactions",
        ["source_email_id"],
        unique=False,
    )
    # NULL source_email_id (manual / agent rows) is exempt — Postgres treats NULLs as distinct.
    op.create_unique_constraint(
        "uq_pending_user_email",
        "finance_pending_transactions",
        ["user_id", "source_email_id"],
    )

    # ── finance_investments: SIP commitment ───────────────────────────────────
    op.add_column(
        "finance_investments",
        sa.Column("committed_monthly", sa.Numeric(precision=12, scale=2), nullable=True),
    )

    # ── finance_merchant_rules ────────────────────────────────────────────────
    op.create_table(
        "finance_merchant_rules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("match_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("pattern", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=True),
        sa.Column("account_id", sa.Uuid(), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["finance_accounts.id"]),
        sa.ForeignKeyConstraint(["category_id"], ["finance_categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_finance_merchant_rules_user_id",
        "finance_merchant_rules",
        ["user_id"],
        unique=False,
    )

    # ── finance_cc_bills ──────────────────────────────────────────────────────
    op.create_table(
        "finance_cc_bills",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=True),
        sa.Column("card_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("statement_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("total_due", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("min_due", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("unbilled", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("paid_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("source_email_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["finance_accounts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "source_email_id", name="uq_cc_bill_email"),
    )
    op.create_index(
        "ix_finance_cc_bills_user_id", "finance_cc_bills", ["user_id"], unique=False
    )
    op.create_index(
        "ix_finance_cc_bills_source_email_id",
        "finance_cc_bills",
        ["source_email_id"],
        unique=False,
    )

    # ── finance_obligation_payments ───────────────────────────────────────────
    op.create_table(
        "finance_obligation_payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("obligation_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("obligation_id", sa.Uuid(), nullable=False),
        sa.Column("period", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("paid", sa.Boolean(), nullable=False),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("paid_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("account_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["finance_accounts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "obligation_type", "obligation_id", "period",
            name="uq_obligation_payment",
        ),
    )
    op.create_index(
        "ix_finance_obligation_payments_user_id",
        "finance_obligation_payments",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_finance_obligation_payments_user_id",
        table_name="finance_obligation_payments",
    )
    op.drop_table("finance_obligation_payments")

    op.drop_index("ix_finance_cc_bills_source_email_id", table_name="finance_cc_bills")
    op.drop_index("ix_finance_cc_bills_user_id", table_name="finance_cc_bills")
    op.drop_table("finance_cc_bills")

    op.drop_index(
        "ix_finance_merchant_rules_user_id", table_name="finance_merchant_rules"
    )
    op.drop_table("finance_merchant_rules")

    op.drop_column("finance_investments", "committed_monthly")

    op.drop_constraint(
        "uq_pending_user_email", "finance_pending_transactions", type_="unique"
    )
    op.drop_index(
        "ix_finance_pending_transactions_source_email_id",
        table_name="finance_pending_transactions",
    )
    op.drop_column("finance_pending_transactions", "parser")
    op.drop_column("finance_pending_transactions", "raw_text")
    op.drop_column("finance_pending_transactions", "source_email_id")
