"""Add health_food_items table seeded with common Indian foods (per-100g macros).

Revision ID: f0a5b2c4d7e8
Revises: e9f4a1b3c6d7
Create Date: 2026-06-11
"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f0a5b2c4d7e8'
down_revision: Union[str, None] = 'e9f4a1b3c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# name, kcal, protein, carbs, fat (per 100g), serving_desc, serving_grams
SEED = [
    ("Roti (whole wheat)", 297, 11.0, 56.0, 4.2, "1 roti", 40),
    ("Plain Rice (cooked)", 130, 2.7, 28.0, 0.3, "1 cup", 160),
    ("Brown Rice (cooked)", 111, 2.6, 23.0, 0.9, "1 cup", 160),
    ("Dal (toor, cooked)", 116, 6.8, 18.0, 1.5, "1 katori", 150),
    ("Rajma (cooked)", 127, 8.7, 22.8, 0.5, "1 katori", 150),
    ("Chole (cooked)", 164, 8.9, 27.4, 2.6, "1 katori", 150),
    ("Paneer", 265, 18.3, 1.2, 20.8, "100g", 100),
    ("Tofu", 76, 8.0, 1.9, 4.8, "100g", 100),
    ("Chicken Breast (cooked)", 165, 31.0, 0.0, 3.6, "100g", 100),
    ("Chicken Curry", 145, 13.5, 3.0, 8.5, "1 katori", 180),
    ("Egg (whole)", 155, 13.0, 1.1, 11.0, "1 egg", 50),
    ("Egg White", 52, 11.0, 0.7, 0.2, "1 egg white", 33),
    ("Fish (rohu, cooked)", 97, 16.6, 0.0, 3.0, "100g", 100),
    ("Mutton Curry", 175, 14.0, 4.0, 11.0, "1 katori", 180),
    ("Curd (dahi)", 60, 3.1, 4.7, 3.0, "1 katori", 150),
    ("Greek Yogurt", 59, 10.0, 3.6, 0.4, "100g", 100),
    ("Milk (toned)", 58, 3.1, 4.7, 3.0, "1 glass", 250),
    ("Buttermilk (chaas)", 19, 0.8, 1.2, 1.1, "1 glass", 250),
    ("Idli", 132, 3.7, 27.5, 0.4, "1 idli", 50),
    ("Dosa (plain)", 168, 3.9, 29.0, 3.7, "1 dosa", 80),
    ("Upma", 132, 3.4, 20.4, 4.0, "1 katori", 150),
    ("Poha", 130, 2.6, 26.9, 1.2, "1 katori", 150),
    ("Paratha (plain)", 326, 6.4, 46.4, 13.0, "1 paratha", 60),
    ("Aloo Paratha", 290, 5.5, 40.0, 12.0, "1 paratha", 100),
    ("Bread (white)", 265, 9.0, 49.0, 3.2, "1 slice", 25),
    ("Bread (brown)", 244, 11.0, 41.0, 3.4, "1 slice", 25),
    ("Oats (raw)", 389, 16.9, 66.3, 6.9, "1/2 cup", 40),
    ("Banana", 89, 1.1, 22.8, 0.3, "1 medium", 118),
    ("Apple", 52, 0.3, 13.8, 0.2, "1 medium", 180),
    ("Mango", 60, 0.8, 15.0, 0.4, "1 cup sliced", 165),
    ("Orange", 47, 0.9, 11.8, 0.1, "1 medium", 130),
    ("Papaya", 43, 0.5, 10.8, 0.3, "1 cup", 145),
    ("Almonds", 579, 21.2, 21.6, 49.9, "10 almonds", 12),
    ("Peanuts (roasted)", 567, 25.8, 16.1, 49.2, "1 handful", 30),
    ("Peanut Butter", 588, 25.0, 20.0, 50.0, "1 tbsp", 16),
    ("Walnuts", 654, 15.2, 13.7, 65.2, "4 halves", 10),
    ("Ghee", 900, 0.0, 0.0, 100.0, "1 tsp", 5),
    ("Olive Oil", 884, 0.0, 0.0, 100.0, "1 tbsp", 14),
    ("Whey Protein (avg)", 400, 80.0, 8.0, 6.0, "1 scoop", 30),
    ("Sprouts (moong)", 30, 3.0, 6.0, 0.2, "1 katori", 100),
    ("Mixed Vegetable Sabzi", 90, 2.5, 10.0, 4.5, "1 katori", 150),
    ("Palak Paneer", 180, 8.5, 6.0, 13.5, "1 katori", 180),
    ("Bhindi Sabzi", 110, 2.0, 9.0, 7.5, "1 katori", 130),
    ("Aloo Sabzi", 120, 2.0, 18.0, 4.5, "1 katori", 150),
    ("Sambar", 65, 3.0, 10.0, 1.5, "1 katori", 180),
    ("Biryani (chicken)", 175, 8.5, 21.0, 6.5, "1 plate", 300),
    ("Khichdi", 120, 4.5, 20.0, 2.5, "1 katori", 200),
    ("Maggi (cooked)", 170, 3.5, 22.0, 7.5, "1 pack", 280),
    ("Samosa", 308, 5.0, 32.0, 17.5, "1 samosa", 100),
    ("Tea with milk & sugar", 37, 1.0, 5.5, 1.2, "1 cup", 150),
    ("Black Coffee", 2, 0.1, 0.0, 0.0, "1 cup", 240),
]


def upgrade() -> None:
    table = op.create_table(
        'health_food_items',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False, unique=True),
        sa.Column('calories', sa.Float(), nullable=False),
        sa.Column('protein', sa.Float(), nullable=False, server_default='0'),
        sa.Column('carbs', sa.Float(), nullable=False, server_default='0'),
        sa.Column('fat', sa.Float(), nullable=False, server_default='0'),
        sa.Column('serving_desc', sa.String(), nullable=True),
        sa.Column('serving_grams', sa.Float(), nullable=True),
        sa.Column('is_custom', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.bulk_insert(table, [
        {
            "id": uuid.uuid4(), "name": n, "calories": kcal, "protein": p,
            "carbs": c, "fat": f, "serving_desc": sd, "serving_grams": sg,
            "is_custom": False,
        }
        for n, kcal, p, c, f, sd, sg in SEED
    ])


def downgrade() -> None:
    op.drop_table('health_food_items')
