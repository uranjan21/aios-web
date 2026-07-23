"""Shared one-shot LLM text generation for insight features (explain, digest, skill-gap, drafting).

All callers treat user/vault content as DATA in prompts, never as instructions.
"""
import logging

from app.core.config import get_settings
from app.services.ai.openai_client import get_openai_client

logger = logging.getLogger(__name__)


async def generate_text(
    system: str, 
    user_content: str, 
    max_tokens: int = 600,
    user_id: str | None = None,
    override_provider: str | None = None,
    override_openai_model: str | None = None,
    override_claude_model: str | None = None,
    base_openai_model: str | None = None,
    base_claude_model: str | None = None,
) -> str:
    """One-shot completion. Raises RuntimeError when the LLM is unavailable.

    base_*_model replaces only the settings-level default (lowest precedence) —
    per-user prefs and per-call overrides still win. Agent runs pass the cheap
    tier here so a scheduled parse/summary never silently bills the chat model.
    """
    settings = get_settings()
    provider = settings.llm_provider
    openai_api_key = settings.openai_api_key
    anthropic_api_key = settings.anthropic_api_key
    openai_model = base_openai_model or settings.openai_chat_model
    claude_model = base_claude_model or settings.claude_model

    if user_id:
        from app.db.session import AsyncSessionLocal
        from sqlmodel import select
        from app.models.user import User
        from app.core.security import decrypt_token
        import uuid
        
        async with AsyncSessionLocal() as session:
            try:
                uid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                result = await session.execute(select(User).where(User.id == uid))
                u = result.scalar_one_or_none()
                if u:
                    if u.llm_provider:
                        provider = u.llm_provider
                    if u.openai_chat_model:
                        openai_model = u.openai_chat_model
                    if u.claude_model:
                        claude_model = u.claude_model
                    if u.openai_api_key_encrypted:
                        openai_api_key = decrypt_token(u.openai_api_key_encrypted)
                    if u.anthropic_api_key_encrypted:
                        anthropic_api_key = decrypt_token(u.anthropic_api_key_encrypted)
            except Exception as e:
                logger.warning(f"Failed to fetch user LLM config: {e}")

    if override_provider and override_provider != "system":
        provider = override_provider
    if override_openai_model:
        openai_model = override_openai_model
    if override_claude_model:
        claude_model = override_claude_model

    if provider == "openai" and not openai_api_key and anthropic_api_key:
        provider = "anthropic"

    if provider == "anthropic":
        if not anthropic_api_key:
            raise RuntimeError("LLM not configured (ANTHROPIC_API_KEY missing)")
        try:
            import anthropic
        except Exception as exc:  # pragma: no cover - dependency should be installed in app env
            raise RuntimeError("Anthropic SDK not installed") from exc

        client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)
        resp = await client.messages.create(
            model=claude_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_content}],
            timeout=30,
        )
        parts = [block.text for block in resp.content if getattr(block, "type", None) == "text"]
        return "\n".join(parts).strip()

    if not openai_api_key:
        raise RuntimeError("LLM not configured (OPENAI_API_KEY missing)")
    client = get_openai_client(api_key=openai_api_key)
    resp = await client.chat.completions.create(
        model=openai_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.4,
        max_tokens=max_tokens,
        timeout=30,
    )
    return (resp.choices[0].message.content or "").strip()
