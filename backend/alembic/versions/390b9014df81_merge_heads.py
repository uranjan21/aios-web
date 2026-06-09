"""merge heads

Revision ID: 390b9014df81
Revises: 0003, add_job_opportunities
Create Date: 2026-06-09 22:14:19.079249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '390b9014df81'
down_revision: Union[str, None] = ('0003', 'add_job_opportunities')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
