"""Replace global unique constraints with per-user composite ones.

Five tables had unique constraints on data columns (name, skill_name,
google_event_id, date, snapshot_month) without including user_id, meaning
two users could never share the same value.  Replace each with a composite
unique covering (user_id, <column>).

Revision ID: h008
Revises: h007
Create Date: 2026-06-22
"""
from alembic import op

revision = 'h008'
down_revision = 'h007'
branch_labels = None
depends_on = None


def upgrade():
    # finance_snapshots: snapshot_month was globally unique
    op.drop_constraint('finance_snapshots_snapshot_month_key', 'finance_snapshots', type_='unique')
    op.create_unique_constraint('uq_snapshot_user_month', 'finance_snapshots', ['user_id', 'snapshot_month'])

    # finance_categories: name was globally unique
    op.drop_constraint('finance_categories_name_key', 'finance_categories', type_='unique')
    op.create_unique_constraint('uq_category_user_name', 'finance_categories', ['user_id', 'name'])

    # skill_inventory: skill_name was globally unique
    op.drop_constraint('skill_inventory_skill_name_key', 'skill_inventory', type_='unique')
    op.create_unique_constraint('uq_skill_user_name', 'skill_inventory', ['user_id', 'skill_name'])

    # calendar_events: google_event_id was globally unique
    op.drop_constraint('calendar_events_google_event_id_key', 'calendar_events', type_='unique')
    op.create_unique_constraint('uq_calendar_user_event', 'calendar_events', ['user_id', 'google_event_id'])

    # google_fit_metrics: date was globally unique
    op.drop_constraint('google_fit_metrics_date_key', 'google_fit_metrics', type_='unique')
    op.create_unique_constraint('uq_fit_user_date', 'google_fit_metrics', ['user_id', 'date'])

    # push_subscriptions: endpoint was globally unique (now scoped per user)
    op.drop_constraint('push_subscriptions_endpoint_key', 'push_subscriptions', type_='unique')
    op.create_unique_constraint('uq_push_user_endpoint', 'push_subscriptions', ['user_id', 'endpoint'])


def downgrade():
    op.drop_constraint('uq_push_user_endpoint', 'push_subscriptions', type_='unique')
    op.create_unique_constraint('push_subscriptions_endpoint_key', 'push_subscriptions', ['endpoint'])

    op.drop_constraint('uq_fit_user_date', 'google_fit_metrics', type_='unique')
    op.create_unique_constraint('google_fit_metrics_date_key', 'google_fit_metrics', ['date'])

    op.drop_constraint('uq_calendar_user_event', 'calendar_events', type_='unique')
    op.create_unique_constraint('calendar_events_google_event_id_key', 'calendar_events', ['google_event_id'])

    op.drop_constraint('uq_skill_user_name', 'skill_inventory', type_='unique')
    op.create_unique_constraint('skill_inventory_skill_name_key', 'skill_inventory', ['skill_name'])

    op.drop_constraint('uq_category_user_name', 'finance_categories', type_='unique')
    op.create_unique_constraint('finance_categories_name_key', 'finance_categories', ['name'])

    op.drop_constraint('uq_snapshot_user_month', 'finance_snapshots', type_='unique')
    op.create_unique_constraint('finance_snapshots_snapshot_month_key', 'finance_snapshots', ['snapshot_month'])
