"""consolidate_agents

Revision ID: 898010fa150a
Revises: 04be8156a34e
Create Date: 2026-07-08 22:20:29.128112

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '898010fa150a'
down_revision: Union[str, None] = '04be8156a34e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM agents WHERE task_id IN ("
            "'aios-news-radar', "
            "'aios-weekly-calendar', "
            "'aios-career-checkpoint', "
            "'aios-evening-review', "
            "'aios-content-performance', "
            "'aios-business-pulse', "
            "'aios-inbox-triage'"
            ")"
        )
    )


def downgrade() -> None:
    pass
