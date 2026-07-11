"""Chat model allowlist — the only models clients may request on the operator's key."""
from app.core.config import get_settings

PROVIDERS = ("openai", "anthropic")


def allowed_models() -> dict[str, list[str]]:
    settings = get_settings()
    return {
        "openai": settings.allowed_openai_models,
        "anthropic": settings.allowed_claude_models,
    }


def validate_provider(provider: str | None) -> str | None:
    return provider if provider in PROVIDERS else None


def validate_model(provider: str | None, model: str | None) -> str | None:
    """Return the model only if it's allowlisted; else None (server default applies).

    When no provider accompanies the model, accept it if either provider
    allowlists it — the resolved provider's agent applies or ignores it.
    """
    if not model:
        return None
    settings = get_settings()
    if provider == "openai":
        pool = settings.allowed_openai_models
    elif provider == "anthropic":
        pool = settings.allowed_claude_models
    else:
        pool = settings.allowed_openai_models + settings.allowed_claude_models
    return model if model in pool else None
