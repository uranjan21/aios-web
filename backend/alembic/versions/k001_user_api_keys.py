"""BYOK: per-user LLM provider API keys.

Control Tower stopped making LLM calls on its own account (2026-08-17). Every
request is now billed to the key its owner supplies, which is what lets the
product be free with no usage cap. This table holds those keys, Fernet-encrypted
with TOKEN_ENCRYPTION_KEY.

`ON DELETE CASCADE` on user_id is deliberate: a deleted account must take its
credentials with it, and the GDPR erasure path derives its table list from live
ORM metadata, so this is swept automatically.

Revision ID: k001_user_api_keys
Revises: p002_hot_path_composites
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k001_user_api_keys"
down_revision: Union[str, None] = "p002_hot_path_composites"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_api_keys",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("key_encrypted", sa.Text(), nullable=False),
        sa.Column("key_hint", sa.String(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "provider", name="uq_user_api_key_provider"),
        # Only the two providers the app can actually talk to. A typo'd provider
        # would otherwise store a key that no call site ever reads.
        sa.CheckConstraint(
            "provider IN ('openai', 'anthropic')", name="ck_user_api_key_provider"
        ),
    )
    op.create_index("ix_user_api_keys_user_id", "user_api_keys", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_api_keys_user_id", table_name="user_api_keys")
    op.drop_table("user_api_keys")
