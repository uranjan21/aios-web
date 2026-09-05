"""Shared one-shot LLM text generation for insight features (explain, digest, skill-gap, drafting).

Every call runs on the CALLING USER'S OWN provider key (BYOK) — resolved here
through `services/ai/keys.py`. A user with no key gets `UserApiKeyMissing`,
which interactive callers turn into a 428 and background jobs treat as "skip the
LLM, emit the facts-only fallback".

All callers treat user/vault content as DATA in prompts, never as instructions.
"""
import logging
import uuid

from app.core.config import get_settings
from app.services.ai.keys import (
    UserApiKeyMissing,
    get_user_api_key,
    list_user_providers,
)
from app.services.ai.openai_client import get_anthropic_client, get_openai_client

logger = logging.getLogger(__name__)


async def resolve_llm_for_user(
    user_id: str | uuid.UUID,
    *,
    override_provider: str | None = None,
    override_openai_model: str | None = None,
    override_claude_model: str | None = None,
    base_openai_model: str | None = None,
    base_claude_model: str | None = None,
) -> tuple[str, str, str]:
    """Return `(provider, model, api_key)` for this user.

    Provider preference order: explicit override → the user's stored preference
    → the instance default (a *model routing* default, not a credential). The
    resolved provider is then forced onto one the user actually has a key for;
    if they have none at all, `UserApiKeyMissing` is raised naming the provider
    they were trying to use, so the UI can deep-link to the right field.
    """
    from app.db.session import AsyncSessionLocal
    from sqlmodel import select
    from app.models.user import User

    settings = get_settings()
    provider = settings.llm_provider
    openai_model = base_openai_model or settings.openai_chat_model
    claude_model = base_claude_model or settings.claude_model

    uid = uuid.UUID(str(user_id))
    async with AsyncSessionLocal() as session:
        u = (await session.execute(select(User).where(User.id == uid))).scalar_one_or_none()
        if u:
            if u.llm_provider:
                provider = u.llm_provider
            if u.openai_chat_model:
                openai_model = u.openai_chat_model
            if u.claude_model:
                claude_model = u.claude_model
        installed = await list_user_providers(session, uid)

        if override_provider and override_provider != "system":
            provider = override_provider
        if override_openai_model:
            openai_model = override_openai_model
        if override_claude_model:
            claude_model = override_claude_model

        if provider not in ("openai", "anthropic"):
            provider = "openai"
        # Use whatever the user actually installed rather than failing on a
        # stale preference for a provider they never configured.
        if provider not in installed:
            other = "anthropic" if provider == "openai" else "openai"
            if other in installed:
                provider = other
            else:
                raise UserApiKeyMissing(provider)

        api_key = await get_user_api_key(session, uid, provider)

    if not api_key:
        raise UserApiKeyMissing(provider)
    model = openai_model if provider == "openai" else claude_model
    return provider, model, api_key


async def generate_text(
    system: str,
    user_content: str,
    max_tokens: int = 600,
    user_id: str | uuid.UUID | None = None,
    override_provider: str | None = None,
    override_openai_model: str | None = None,
    override_claude_model: str | None = None,
    base_openai_model: str | None = None,
    base_claude_model: str | None = None,
) -> str:
    """One-shot completion on the user's own key.

    Raises `UserApiKeyMissing` when the user has no usable credential.

    base_*_model replaces only the settings-level default (lowest precedence) —
    per-user prefs and per-call overrides still win. Agent runs pass the cheap
    tier here so a scheduled parse/summary never silently uses the chat model.
    """
    if user_id is None:
        # Not a defensive check: with BYOK there is no key that is not somebody's.
        raise UserApiKeyMissing(override_provider or "openai")

    provider, model, api_key = await resolve_llm_for_user(
        user_id,
        override_provider=override_provider,
        override_openai_model=override_openai_model,
        override_claude_model=override_claude_model,
        base_openai_model=base_openai_model,
        base_claude_model=base_claude_model,
    )

    if provider == "anthropic":
        client = get_anthropic_client(api_key)
        resp = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_content}],
        )
        parts = [block.text for block in resp.content if getattr(block, "type", None) == "text"]
        return "\n".join(parts).strip()

    client = get_openai_client(api_key)
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.4,
        max_tokens=max_tokens,
    )
    return (resp.choices[0].message.content or "").strip()
