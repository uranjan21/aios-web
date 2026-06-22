"""Add token_version to users and oauth_states table (H3 + H4)

Revision ID: h005
Revises: h004
Create Date: 2026-06-22

H4: token_version on users allows server-side JWT revocation on logout /
    password-change without a Redis deny-list.
H3: oauth_states table replaces the in-process _pending_states dict so OAuth
    CSRF tokens survive pod restarts and multi-worker deployments.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'h005'
down_revision: Union[str, None] = 'h004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('token_version', sa.Integer(), nullable=False, server_default='1'),
    )
    op.create_table(
        'oauth_states',
        sa.Column('state', sa.String(length=128), nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('state'),
    )


def downgrade() -> None:
    op.drop_table('oauth_states')
    op.drop_column('users', 'token_version')
