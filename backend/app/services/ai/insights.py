"""Shared one-shot LLM text generation for insight features (explain, digest, skill-gap, drafting).

All callers treat user/vault content as DATA in prompts, never as instructions.
"""
import logging

from app.core.config import get_settings
from app.services.ai.openai_client import get_openai_client

logger = logging.getLogger(__name__)


async def generate_text(system: str, user: str, max_tokens: int = 600) -> str:
    """One-shot completion. Raises RuntimeError when the LLM is unavailable."""
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("LLM not configured (OPENAI_API_KEY missing)")
    client = get_openai_client()
    resp = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.4,
        max_tokens=max_tokens,
        timeout=30,
    )
    return (resp.choices[0].message.content or "").strip()
