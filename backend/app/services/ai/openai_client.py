"""Shared OpenAI client."""
from functools import lru_cache

from openai import AsyncOpenAI

from app.core.config import get_settings


@lru_cache
def get_openai_client() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(
        api_key=settings.openai_api_key,
    )


# Module-level client instance
openai_client = AsyncOpenAI(api_key=get_settings().openai_api_key)
