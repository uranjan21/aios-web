"""Add calendar_events and google_fit_metrics tables

Revision ID: g001
Revises: f2e6a113e56f
Create Date: 2026-06-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "g001"
down_revision = "f0a5b2c4d7e8"
branch_labels = None
depends_on = None

TZ = sa.TIMESTAMP(timezone=True)


def upgrade() -> None:
    op.create_table(
        "calendar_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("google_event_id", sa.Text, unique=True, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("start_time", TZ),
        sa.Column("end_time", TZ),
        sa.Column("location", sa.Text),
        sa.Column("status", sa.Text, nullable=False, server_default="confirmed"),
        sa.Column("html_link", sa.Text),
        sa.Column("created_at", TZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", TZ, nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_calendar_events_start", "calendar_events", ["start_time"])

    op.create_table(
        "google_fit_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("date", sa.Text, unique=True, nullable=False),
        sa.Column("steps", sa.Float),
        sa.Column("calories", sa.Float),
        sa.Column("distance_m", sa.Float),
        sa.Column("weight_kg", sa.Float),
        sa.Column("heart_rate_bpm", sa.Float),
        sa.Column("created_at", TZ, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", TZ, nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_google_fit_metrics_date", "google_fit_metrics", ["date"])


def downgrade() -> None:
    op.drop_table("google_fit_metrics")
    op.drop_table("calendar_events")
