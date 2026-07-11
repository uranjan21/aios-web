"""Vault ownership — the shared-filesystem vault belongs to exactly one user.

The Obsidian vault is a single shared filesystem (self-host feature), not
per-user storage. Chat context and vault tools must therefore be restricted to
the one user the vault belongs to; every other tenant gets DB-backed knowledge
(VaultFile/VaultChunk) only. Owner = first registered user, matching the
watcher's rule in app.main.
"""
import uuid  # noqa: F401 — return type

from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.user import User

async def get_vault_owner_id() -> uuid.UUID | None:
    """Id of the user the shared vault belongs to, or None when vault sync is off."""
    if not get_settings().vault_sync_enabled:
        return None
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).order_by(User.created_at).limit(1))
        user = result.scalar_one_or_none()
        return user.id if user else None


async def is_vault_owner(user_id) -> bool:
    owner = await get_vault_owner_id()
    return owner is not None and str(owner) == str(user_id)
