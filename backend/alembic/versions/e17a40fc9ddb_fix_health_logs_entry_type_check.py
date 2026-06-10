"""fix_health_logs_entry_type_check

Revision ID: e17a40fc9ddb
Revises: f2e6a113e56f
Create Date: 2026-06-10 02:55:37.893068

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e17a40fc9ddb'
down_revision: Union[str, None] = 'f2e6a113e56f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OLD_TYPES = "'gym','weight','food','water','body_fat','note'"
NEW_TYPES = "'gym','weight','food','meal','water','steps','body_fat','sleep','note'"


def upgrade() -> None:
    # entry_type check constraint was missing 'meal', 'steps', 'sleep' — used by
    # Nutrition, Steps, and Sleep tracking but never added to the constraint.
    op.drop_constraint('health_logs_entry_type_check', 'health_logs', type_='check')
    op.create_check_constraint(
        'health_logs_entry_type_check',
        'health_logs',
        f"entry_type IN ({NEW_TYPES})",
    )


def downgrade() -> None:
    op.drop_constraint('health_logs_entry_type_check', 'health_logs', type_='check')
    op.create_check_constraint(
        'health_logs_entry_type_check',
        'health_logs',
        f"entry_type IN ({OLD_TYPES})",
    )
