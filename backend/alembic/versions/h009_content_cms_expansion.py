"""Content CMS expansion — campaigns table + rich content_items columns.

Adds the content_campaigns table and extends content_items with body,
organisation (tags/pillar/campaign/priority/position), scheduling
(scheduled_at/published_at/url) and engagement metrics
(views/likes/comments/shares).

Revision ID: h009
Revises: h008
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa

revision = 'h009'
down_revision = 'h008'
branch_labels = None
depends_on = None


def upgrade():
    # ── content_campaigns ──────────────────────────────────────────────
    op.create_table(
        'content_campaigns',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('goal', sa.String(), nullable=True),
        sa.Column('color', sa.String(), nullable=False, server_default='#CA8A04'),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_campaign_user_name'),
    )
    op.create_index('ix_content_campaigns_user_id', 'content_campaigns', ['user_id'])

    # ── content_items new columns ──────────────────────────────────────
    op.add_column('content_items', sa.Column('priority', sa.String(), nullable=False, server_default='medium'))
    op.add_column('content_items', sa.Column('body', sa.Text(), nullable=True))
    op.add_column('content_items', sa.Column('tags', sa.String(), nullable=True))
    op.add_column('content_items', sa.Column('pillar', sa.String(), nullable=True))
    op.add_column('content_items', sa.Column('campaign_id', sa.UUID(), nullable=True))
    op.add_column('content_items', sa.Column('position', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('content_items', sa.Column('scheduled_at', sa.DateTime(), nullable=True))
    op.add_column('content_items', sa.Column('published_at', sa.DateTime(), nullable=True))
    op.add_column('content_items', sa.Column('url', sa.String(), nullable=True))
    op.add_column('content_items', sa.Column('views', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('content_items', sa.Column('likes', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('content_items', sa.Column('comments', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('content_items', sa.Column('shares', sa.Integer(), nullable=False, server_default='0'))
    op.create_index('ix_content_items_campaign_id', 'content_items', ['campaign_id'])
    op.create_foreign_key(
        'fk_content_items_campaign_id', 'content_items', 'content_campaigns',
        ['campaign_id'], ['id'], ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_content_items_campaign_id', 'content_items', type_='foreignkey')
    op.drop_index('ix_content_items_campaign_id', 'content_items')
    for col in ('shares', 'likes', 'comments', 'views', 'url', 'published_at',
                'scheduled_at', 'position', 'campaign_id', 'pillar', 'tags', 'body', 'priority'):
        op.drop_column('content_items', col)
    op.drop_index('ix_content_campaigns_user_id', 'content_campaigns')
    op.drop_table('content_campaigns')
