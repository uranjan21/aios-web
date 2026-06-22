"""Add user_id FK to oauth_states for per-user state isolation.

Revision ID: h007
Revises: h006
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa

revision = 'h007'
down_revision = 'h006'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'oauth_states',
        sa.Column('user_id', sa.UUID(), nullable=True)
    )
    op.create_foreign_key(
        'fk_oauth_states_user_id',
        'oauth_states', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade():
    op.drop_constraint('fk_oauth_states_user_id', 'oauth_states', type_='foreignkey')
    op.drop_column('oauth_states', 'user_id')
