"""Fix daily_token_usage primary key

Revision ID: 083a9f4c2477
Revises: b218b31f3e21
Create Date: 2026-07-09 08:49:29.288387

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '083a9f4c2477'
down_revision: Union[str, None] = 'b218b31f3e21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE daily_token_usage DROP CONSTRAINT IF EXISTS daily_token_usage_pkey")
    op.create_primary_key('daily_token_usage_pkey', 'daily_token_usage', ['usage_date', 'user_id'])


def downgrade() -> None:
    op.execute("ALTER TABLE daily_token_usage DROP CONSTRAINT IF EXISTS daily_token_usage_pkey")
    op.create_primary_key('daily_token_usage_pkey', 'daily_token_usage', ['usage_date'])
