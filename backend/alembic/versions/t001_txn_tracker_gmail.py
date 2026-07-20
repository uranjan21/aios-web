"""Transaction tracker overhaul: multi-account Gmail + review-first pending flow.

- integration_credentials: account_email column; unique key widened to
  (user_id, provider, account_email) so N Gmail accounts can be linked.
  Existing gmail rows backfill account_email from metadata->>'email'.
- gmail_messages: account attribution + full body storage for financial
  messages + extraction marker; unique key widened to include account_email.
- finance_pending_transactions: dedupe_key/txn_ref (idempotency), category_id
  (pre-resolved suggestion), gmail provenance columns; auto_commit_at becomes
  nullable (NULL = review required, the new default). Existing unreviewed rows
  get auto_commit_at cleared so nothing silently commits after this deploy.
- finance_settings: per-user auto_commit_hours opt-in.
- agents data fix: upi-tracker rows still on the seeded defaults are renamed
  to "Transaction Tracker" with the new 6-hourly cron.

Note: gmail messages synced before this migration were snippet-only; the new
financial sweep may re-tag them with bodies. Transactions from the ~7-day
overlap window are guarded by the pending/ledger dedupe at extraction time.

Revision ID: t001_txn_tracker_gmail
Revises: u003_verification_sent_at
Create Date: 2026-07-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "t001_txn_tracker_gmail"
down_revision = "u003_verification_sent_at"
branch_labels = None
depends_on = None


def upgrade():
    # --- integration_credentials: multi-account ---
    op.add_column(
        "integration_credentials",
        sa.Column("account_email", sa.Text(), nullable=False, server_default=""),
    )
    op.execute(
        "UPDATE integration_credentials "
        "SET account_email = COALESCE(metadata->>'email', '') "
        "WHERE provider = 'gmail'"
    )
    op.drop_constraint("uq_integration_user_provider", "integration_credentials", type_="unique")
    op.create_unique_constraint(
        "uq_integration_user_provider_account",
        "integration_credentials",
        ["user_id", "provider", "account_email"],
    )

    # --- gmail_messages: account attribution + bodies + extraction marker ---
    op.add_column("gmail_messages", sa.Column("account_email", sa.Text(), nullable=False, server_default=""))
    op.add_column("gmail_messages", sa.Column("body_text", sa.Text(), nullable=True))
    op.add_column("gmail_messages", sa.Column("is_financial", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("gmail_messages", sa.Column("extracted_at", sa.DateTime(), nullable=True))
    # Attribute legacy rows to the (single) gmail account they came from, so the
    # new per-account upsert doesn't duplicate them under the real address.
    op.execute(
        "UPDATE gmail_messages gm SET account_email = COALESCE("
        "  (SELECT ic.metadata->>'email' FROM integration_credentials ic "
        "   WHERE ic.user_id = gm.user_id AND ic.provider = 'gmail' LIMIT 1), '')"
    )
    op.drop_constraint("uq_gmail_user_message", "gmail_messages", type_="unique")
    op.create_unique_constraint(
        "uq_gmail_user_account_message",
        "gmail_messages",
        ["user_id", "account_email", "gmail_id"],
    )

    # --- finance_pending_transactions: idempotency + provenance + review-first ---
    op.add_column("finance_pending_transactions", sa.Column("dedupe_key", sa.String(), nullable=True))
    op.add_column("finance_pending_transactions", sa.Column("txn_ref", sa.String(), nullable=True))
    op.add_column(
        "finance_pending_transactions",
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("finance_categories.id"), nullable=True),
    )
    op.add_column("finance_pending_transactions", sa.Column("gmail_message_id", sa.String(), nullable=True))
    op.add_column("finance_pending_transactions", sa.Column("source_account_email", sa.String(), nullable=True))
    op.create_index(
        "ix_finance_pending_user_dedupe",
        "finance_pending_transactions",
        ["user_id", "dedupe_key"],
    )
    op.alter_column(
        "finance_pending_transactions",
        "auto_commit_at",
        existing_type=sa.DateTime(),
        nullable=True,
    )
    # Review-required is the new default: stop the clock on anything unreviewed.
    op.execute("UPDATE finance_pending_transactions SET auto_commit_at = NULL WHERE status = 'pending'")

    # --- finance_settings ---
    op.create_table(
        "finance_settings",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), primary_key=True, nullable=False),
        sa.Column("auto_commit_hours", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # --- agents: rename rows still carrying the old seeded defaults ---
    op.execute(
        "UPDATE agents SET name = 'Transaction Tracker', "
        "cron_expression = '0 */6 * * *', "
        "description = 'Reads transaction emails from your linked Gmail accounts and queues them for review.' "
        "WHERE task_id = 'aios-upi-tracker' "
        "AND name = 'UPI Tracker' AND cron_expression = '0 6 * * *'"
    )


def downgrade():
    op.execute(
        "UPDATE agents SET name = 'UPI Tracker', cron_expression = '0 6 * * *', "
        "description = 'Fetches and categorizes UPI transactions from your emails.' "
        "WHERE task_id = 'aios-upi-tracker' AND name = 'Transaction Tracker'"
    )
    op.drop_table("finance_settings")
    op.execute("UPDATE finance_pending_transactions SET auto_commit_at = created_at + interval '24 hours' WHERE auto_commit_at IS NULL")
    op.alter_column("finance_pending_transactions", "auto_commit_at", existing_type=sa.DateTime(), nullable=False)
    op.drop_index("ix_finance_pending_user_dedupe", table_name="finance_pending_transactions")
    op.drop_column("finance_pending_transactions", "source_account_email")
    op.drop_column("finance_pending_transactions", "gmail_message_id")
    op.drop_column("finance_pending_transactions", "category_id")
    op.drop_column("finance_pending_transactions", "txn_ref")
    op.drop_column("finance_pending_transactions", "dedupe_key")
    op.drop_constraint("uq_gmail_user_account_message", "gmail_messages", type_="unique")
    op.create_unique_constraint("uq_gmail_user_message", "gmail_messages", ["user_id", "gmail_id"])
    op.drop_column("gmail_messages", "extracted_at")
    op.drop_column("gmail_messages", "is_financial")
    op.drop_column("gmail_messages", "body_text")
    op.drop_column("gmail_messages", "account_email")
    op.drop_constraint("uq_integration_user_provider_account", "integration_credentials", type_="unique")
    op.create_unique_constraint("uq_integration_user_provider", "integration_credentials", ["user_id", "provider"])
    op.drop_column("integration_credentials", "account_email")
