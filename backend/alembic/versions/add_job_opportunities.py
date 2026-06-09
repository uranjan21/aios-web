"""Alembic migration: add job_opportunities table."""
import sqlalchemy as sa
from alembic import op
import sqlalchemy.dialects.postgresql as pg

revision = "add_job_opportunities"
down_revision = None  # adjust to your latest revision if needed
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_opportunities",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="prospect"),
        sa.Column("applied_date", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("job_opportunities")
