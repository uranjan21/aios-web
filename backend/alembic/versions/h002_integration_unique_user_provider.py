"""Integration credentials: unique per (user_id, provider) instead of global provider

Revision ID: h002
Revises: h001
Create Date: 2026-06-21 20:00:00.000000

Fixes C1: provider was globally unique, so only one user system-wide could
connect each provider. Make it unique per user instead.
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'h002'
down_revision: Union[str, None] = 'h001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old global-unique constraint on provider (Postgres default name).
    op.execute(
        'ALTER TABLE integration_credentials '
        'DROP CONSTRAINT IF EXISTS integration_credentials_provider_key'
    )
    op.create_unique_constraint(
        'uq_integration_user_provider',
        'integration_credentials',
        ['user_id', 'provider'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_integration_user_provider',
        'integration_credentials',
        type_='unique',
    )
    op.create_unique_constraint(
        'integration_credentials_provider_key',
        'integration_credentials',
        ['provider'],
    )
