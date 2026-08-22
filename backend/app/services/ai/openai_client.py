"""Provider clients — constructed per user key, with real timeouts.

BYOK: there is no instance key, so every factory here REQUIRES the caller to
have resolved the calling user's own credential through `services/ai/keys.py`.

Timeouts (S15): both SDKs default to a 10-minute request timeout while gunicorn
reaps the worker at 120s, so a hung provider call took the worker with it and
the client saw a dropped connection instead of an error. The SDK retry policy
covers exactly the transient classes we want — 408/409/429/5xx and connection
errors — and never retries a 401/403, which matters more under BYOK than it did
before: a bad user key must surface immediately, not after three backoffs.
"""
from functools import lru_cache

from openai import AsyncOpenAI

from app.services.ai.keys import UserApiKeyMissing

# One provider call must finish well inside gunicorn's 120s worker timeout.
LLM_TIMEOUT_SECONDS = 60.0
# Streaming turns can legitimately run longer than a one-shot completion.
LLM_STREAM_TIMEOUT_SECONDS = 110.0
LLM_MAX_RETRIES = 2


def get_openai_client(api_key: str, *, timeout: float = LLM_TIMEOUT_SECONDS) -> AsyncOpenAI:
    """Client bound to ONE user's key. Never falls back to a server key."""
    if not api_key:
        raise UserApiKeyMissing("openai")
    return _get_cached_openai(api_key, timeout)


def get_anthropic_client(api_key: str, *, timeout: float = LLM_TIMEOUT_SECONDS):
    if not api_key:
        raise UserApiKeyMissing("anthropic")
    return _get_cached_anthropic(api_key, timeout)


# Cache key includes the api_key itself, so a client can only ever be handed
# back to a caller that already holds that same key — one user's client cannot
# reach another. Rotating a key simply produces a new entry.
@lru_cache(maxsize=32)
def _get_cached_openai(api_key: str, timeout: float) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key, timeout=timeout, max_retries=LLM_MAX_RETRIES)


@lru_cache(maxsize=32)
def _get_cached_anthropic(api_key: str, timeout: float):
    import anthropic

    return anthropic.AsyncAnthropic(
        api_key=api_key, timeout=timeout, max_retries=LLM_MAX_RETRIES
    )
