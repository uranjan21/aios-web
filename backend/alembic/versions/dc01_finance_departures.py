"""Finance: the schema the redesign canvas asks for.

Closes five of the sixteen documented departures in
`frontend/docs/DC_REDESIGN_IMPLEMENTATION_PLAN.md` §8b. Each addition exists
because a scalar the app already stores discards the dimension the canvas
draws:

- `finance_obligation_payments.principal_component` / `.interest_component` —
  a loan row knows what is *outstanding*, never what has been *paid* and how it
  split. The split depends on the balance at payment time, so it is recorded
  when the payment is marked paid, not derived later.
- `finance_goal_contributions` — `finance_goals.current_amount` is a running
  total; "contributed per month" is unanswerable from a running total.
- `finance_investment_transactions` — XIRR needs dated cashflows, which
  `invested_amount` collapses.
- `finance_investment_valuations` — a portfolio trend needs a history of
  values, not the one `current_value` last typed in.
- `finance_accounts.credit_limit` / sync columns — utilization and sync health
  had nowhere to live.

Datetimes here are NAIVE, matching every existing finance column (see the
`NaiveDateTime` note in backend/CLAUDE.md) — a tz-aware column would make
asyncpg reject the writes the rest of the finance API performs.

Revision ID: dc01_finance_departures
Revises: w006_plan_blocks
Create Date: 2026-08-02
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "dc01_finance_departures"
down_revision = "w006_plan_blocks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Accounts: utilization + sync health ──────────────────────────────────
    op.add_column(
        "finance_accounts", sa.Column("credit_limit", sa.Numeric(12, 2), nullable=True)
    )
    op.add_column(
        "finance_accounts", sa.Column("last_synced_at", sa.DateTime(), nullable=True)
    )
    op.add_column("finance_accounts", sa.Column("sync_status", sa.String(), nullable=True))

    # ── Loans: the amortization split of each payment ────────────────────────
    op.add_column(
        "finance_obligation_payments",
        sa.Column("principal_component", sa.Numeric(12, 2), nullable=True),
    )
    op.add_column(
        "finance_obligation_payments",
        sa.Column("interest_component", sa.Numeric(12, 2), nullable=True),
    )

    # ── Inbox: how a pending row left the queue ──────────────────────────────
    # `auto_commit_at` is a deadline, not an outcome — a user who reviews before
    # it fires still has it set, so "filed automatically" was unanswerable.
    op.add_column(
        "finance_pending_transactions", sa.Column("committed_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "finance_pending_transactions",
        sa.Column("auto_committed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # ── Goal contributions ───────────────────────────────────────────────────
    op.create_table(
        "finance_goal_contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "goal_id",
            postgresql.UUID(as_uuid=True),
            # Deleting a goal takes its contribution history with it — the rows
            # are meaningless without the goal they funded.
            sa.ForeignKey("finance_goals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("contributed_at", sa.DateTime(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finance_accounts.id"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_finance_goal_contributions_user_id", "finance_goal_contributions", ["user_id"]
    )
    op.create_index(
        "ix_finance_goal_contributions_goal_id", "finance_goal_contributions", ["goal_id"]
    )
    # Every read is "this user's contributions in date order", for a series.
    op.create_index(
        "ix_goal_contrib_user_date",
        "finance_goal_contributions",
        ["user_id", "contributed_at"],
    )

    # ── Investment cashflows ─────────────────────────────────────────────────
    op.create_table(
        "finance_investment_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "investment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finance_investments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(), nullable=False, server_default="buy"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("units", sa.Numeric(14, 4), nullable=True),
        sa.Column("transacted_at", sa.DateTime(), nullable=False),
        sa.Column("is_sip", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finance_accounts.id"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_finance_investment_transactions_user_id",
        "finance_investment_transactions",
        ["user_id"],
    )
    op.create_index(
        "ix_finance_investment_transactions_investment_id",
        "finance_investment_transactions",
        ["investment_id"],
    )
    op.create_index(
        "ix_invest_txn_user_date",
        "finance_investment_transactions",
        ["user_id", "transacted_at"],
    )

    # ── Daily portfolio valuation ────────────────────────────────────────────
    op.create_table(
        "finance_investment_valuations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("as_of", sa.Date(), nullable=False),
        sa.Column("invested", sa.Numeric(14, 2), nullable=False),
        sa.Column("value", sa.Numeric(14, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        # One valuation per user per day — the nightly job upserts on this.
        sa.UniqueConstraint("user_id", "as_of", name="uq_investment_valuation_day"),
    )
    op.create_index(
        "ix_finance_investment_valuations_user_id",
        "finance_investment_valuations",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_finance_investment_valuations_user_id", table_name="finance_investment_valuations"
    )
    op.drop_table("finance_investment_valuations")

    op.drop_index("ix_invest_txn_user_date", table_name="finance_investment_transactions")
    op.drop_index(
        "ix_finance_investment_transactions_investment_id",
        table_name="finance_investment_transactions",
    )
    op.drop_index(
        "ix_finance_investment_transactions_user_id",
        table_name="finance_investment_transactions",
    )
    op.drop_table("finance_investment_transactions")

    op.drop_index("ix_goal_contrib_user_date", table_name="finance_goal_contributions")
    op.drop_index(
        "ix_finance_goal_contributions_goal_id", table_name="finance_goal_contributions"
    )
    op.drop_index(
        "ix_finance_goal_contributions_user_id", table_name="finance_goal_contributions"
    )
    op.drop_table("finance_goal_contributions")

    op.drop_column("finance_pending_transactions", "auto_committed")
    op.drop_column("finance_pending_transactions", "committed_at")

    op.drop_column("finance_obligation_payments", "interest_component")
    op.drop_column("finance_obligation_payments", "principal_component")

    op.drop_column("finance_accounts", "sync_status")
    op.drop_column("finance_accounts", "last_synced_at")
    op.drop_column("finance_accounts", "credit_limit")
