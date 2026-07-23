"""Sentry error reporting — opt-in via SENTRY_DSN.

This app stores financial and health data, so the before_send hook below strips
request bodies, cookies and auth headers before anything leaves the process.
When SENTRY_DSN is unset (dev / test / self-host) nothing is initialized and
nothing is sent.
"""
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Header/cookie/body keys that must never reach Sentry.
_SENSITIVE_KEYS = {
    "authorization", "cookie", "set-cookie", "x-api-key",
    "password", "token", "aios_token", "api_key",
}


def _scrub(event: dict, _hint: dict) -> dict | None:
    """Drop request bodies and sensitive headers/cookies from every event."""
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("data", None)      # request body — may hold amounts, health notes
        request.pop("cookies", None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            for k in list(headers):
                if k.lower() in _SENSITIVE_KEYS:
                    headers[k] = "[scrubbed]"
    return event


def init_sentry() -> bool:
    """Initialize Sentry if configured. Returns True when active."""
    settings = get_settings()
    if not settings.sentry_dsn:
        return False
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning("SENTRY_DSN set but sentry-sdk is not installed — error reporting is OFF")
        return False

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,            # never attach user IP / cookies automatically
        before_send=_scrub,
    )
    logger.info("Sentry initialized (env=%s)", settings.environment)
    return True
