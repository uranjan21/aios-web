"""Shared OpenAI client."""
from functools import lru_cache

from openai import AsyncOpenAI

from app.core.config import get_settings


def get_openai_client(api_key: str | None = None) -> AsyncOpenAI:
    settings = get_settings()
    return _get_cached_client(api_key or settings.openai_api_key)


@lru_cache(maxsize=4)
def _get_cached_client(api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key)
