"""Drop every billing table — Control Tower is free, bring-your-own-API-key.

All charging, subscriptions, Stripe, module entitlements, plan gating, AI credit
quotas and usage metering were removed from the product on 2026-08-20 by an
explicit user decision. Users now paste their own OpenAI/Anthropic key
(`user_api_keys`, revision `k001_user_api_keys`) and the server never spends
money on anyone's behalf, so none of this data has a consumer any more.

Tables dropped: `subscriptions`, `ai_usage_records`, `failed_webhooks`,
`stripe_event_idempotency`.

**IRREVERSIBLE FOR DATA.** `downgrade()` recreates the table structures exactly
as `h004`+`h010`, `h011`, `u002` and `1f2e5f90e2da` left them, but the rows are
gone permanently — there is no backup step here and no source to re-derive them
from. Take a `pg_dump` before running this if the historical billing rows matter.

Revision ID: m001_drop_billing
Revises: k001_user_api_keys
Create Date: 2026-08-20
"""
from alembic import op
import sqlalchemy as sa

revision = "m001_drop_billing"
down_revision = "k001_user_api_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_stripe_event_idempotency_event_id", table_name="stripe_event_idempotency")
    op.drop_table("stripe_event_idempotency")

    op.drop_index("ix_failed_webhooks_next_retry_at", table_name="failed_webhooks")
    op.drop_index("ix_failed_webhooks_event_id", table_name="failed_webhooks")
    op.drop_table("failed_webhooks")

    op.drop_index("ix_ai_usage_records_ts", table_name="ai_usage_records")
    op.drop_index("ix_ai_usage_records_user_id", table_name="ai_usage_records")
    op.drop_table("ai_usage_records")

    op.drop_index("ix_subscriptions_stripe_subscription_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_stripe_customer_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")


def downgrade() -> None:
    """Recreate the structures only. The rows are NOT recoverable."""
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("plan", sa.String(), nullable=False, server_default="free"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("addons", sa.JSON(), nullable=True),
        sa.Column("modules", sa.JSON(), nullable=True),
        sa.Column("bundle", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("free_area", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_subscription_user"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_stripe_customer_id", "subscriptions", ["stripe_customer_id"])
    op.create_index("ix_subscriptions_stripe_subscription_id", "subscriptions", ["stripe_subscription_id"])

    op.create_table(
        "ai_usage_records",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ts", sa.DateTime(), nullable=False),
        sa.Column("units", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("source", sa.String(), nullable=False, server_default="chat"),
        sa.Column("reported_to_stripe", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_ai_usage_records_user_id", "ai_usage_records", ["user_id"])
    op.create_index("ix_ai_usage_records_ts", "ai_usage_records", ["ts"])

    op.create_table(
        "failed_webhooks",
        sa.Column("id", sa.Uuid(), nullable=False, primary_key=True),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("error", sa.Text(), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_failed_webhooks_event_id", "failed_webhooks", ["event_id"])
    op.create_index("ix_failed_webhooks_next_retry_at", "failed_webhooks", ["next_retry_at"])

    op.create_table(
        "stripe_event_idempotency",
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("processed_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_index("ix_stripe_event_idempotency_event_id", "stripe_event_idempotency", ["event_id"])
