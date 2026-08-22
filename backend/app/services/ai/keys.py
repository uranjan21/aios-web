"""BYOK key resolution — the single source of every LLM credential.

Control Tower makes no LLM calls on its own account. Each user supplies their
own provider key, it is stored Fernet-encrypted in `user_api_keys`, and every
call site resolves it through this module.

There is deliberately NO fallback to an instance-level key. A server key that
silently covers users who never set one is exactly the uncapped-spend hole the
2026-08-16 audit flagged (a public signup could spend the operator's money
without limit), and it is the reason usage metering and quotas existed at all.
Removing the fallback is what let all of that machinery be deleted.
"""
import logging
import uuid
from typing import Literal, Optional

from sqlalchemy import select

from app.core.security import encrypt_token, decrypt_token
from app.models.api_keys import UserApiKey

logger = logging.getLogger(__name__)

Provider = Literal["openai", "anthropic"]
PROVIDERS: tuple[str, ...] = ("openai", "anthropic")


class UserApiKeyMissing(Exception):
    """Raised when a user has no usable key for the provider being called.

    Callers turn this into a 402-free, non-billing 428 ("configure your key")
    at the API edge, or into a graceful facts-only degrade on background jobs
    where there is nobody to prompt.
    """

    def __init__(self, provider: str):
        self.provider = provider
        super().__init__(
            f"No {provider} API key configured for this account. "
            f"Add one in Settings → AI & knowledge to use AI features."
        )


def _hint(raw_key: str) -> str:
    """Last 4 characters, for 'sk-…4f2a' style display. Never reversible."""
    return raw_key[-4:] if len(raw_key) >= 4 else ""


async def get_user_api_key(db, user_id: uuid.UUID, provider: str) -> Optional[str]:
    """Return the user's decrypted key for `provider`, or None if unset.

    A row whose ciphertext cannot be decrypted (rotated TOKEN_ENCRYPTION_KEY,
    corrupted value) is treated as missing rather than raising, so one bad row
    degrades a single user's AI features instead of 500ing every request.
    """
    if provider not in PROVIDERS:
        return None
    row = (
        await db.execute(
            select(UserApiKey).where(
                UserApiKey.user_id == user_id, UserApiKey.provider == provider
            )
        )
    ).scalar_one_or_none()
    if not row:
        return None
    try:
        return decrypt_token(row.key_encrypted)
    except Exception:
        logger.warning(
            "Could not decrypt %s key for user %s — treating as unset", provider, user_id
        )
        return None


async def require_user_api_key(db, user_id: uuid.UUID, provider: str) -> str:
    """Same as `get_user_api_key` but raises `UserApiKeyMissing` when absent."""
    key = await get_user_api_key(db, user_id, provider)
    if not key:
        raise UserApiKeyMissing(provider)
    return key


async def list_user_providers(db, user_id: uuid.UUID) -> dict[str, str]:
    """`{provider: hint}` for every key the user has installed.

    Returns hints only — the plaintext key never leaves this module except
    through the two resolvers above.
    """
    rows = (
        await db.execute(select(UserApiKey).where(UserApiKey.user_id == user_id))
    ).scalars().all()
    return {r.provider: r.key_hint for r in rows}


async def set_user_api_key(db, user_id: uuid.UUID, provider: str, raw_key: str) -> str:
    """Upsert the user's key for `provider`. Returns the display hint."""
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider {provider!r}")
    raw_key = raw_key.strip()
    if not raw_key:
        raise ValueError("API key must not be empty")

    row = (
        await db.execute(
            select(UserApiKey).where(
                UserApiKey.user_id == user_id, UserApiKey.provider == provider
            )
        )
    ).scalar_one_or_none()

    from datetime import datetime

    hint = _hint(raw_key)
    if row:
        row.key_encrypted = encrypt_token(raw_key)
        row.key_hint = hint
        row.updated_at = datetime.utcnow()
        db.add(row)
    else:
        db.add(
            UserApiKey(
                user_id=user_id,
                provider=provider,
                key_encrypted=encrypt_token(raw_key),
                key_hint=hint,
            )
        )
    await db.commit()
    return hint


async def delete_user_api_key(db, user_id: uuid.UUID, provider: str) -> bool:
    """Remove the user's key for `provider`. True if a row was deleted."""
    row = (
        await db.execute(
            select(UserApiKey).where(
                UserApiKey.user_id == user_id, UserApiKey.provider == provider
            )
        )
    ).scalar_one_or_none()
    if not row:
        return False
    await db.delete(row)
    await db.commit()
    return True
