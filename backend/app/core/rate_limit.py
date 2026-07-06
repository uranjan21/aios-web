import logging

from slowapi import Limiter
from starlette.requests import Request

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _get_client_ip(request: Request) -> str:
    """Rate-limit key = the socket peer address.

    Behind a load balancer this is the LB's IP, which would collapse every
    client into one bucket. The correct fix is at the ASGI server, NOT here:
    run uvicorn/gunicorn with ``--proxy-headers --forwarded-allow-ips=<trusted>``
    so Starlette rewrites ``request.client.host`` to the real client. Reading
    X-Forwarded-For directly here would be spoofable, so we deliberately don't.
    """
    if request.client:
        return request.client.host
    return "unknown"


_settings = get_settings()

# Use Redis in multi-worker deploys so counters are shared across processes;
# fall back to per-process memory only when REDIS_URL is unset (single worker / dev).
if _settings.redis_url:
    limiter = Limiter(key_func=_get_client_ip, storage_uri=_settings.redis_url)
else:
    if _settings.environment == "production":
        logger.warning(
            "RATE LIMITER using in-memory storage in production — counters are "
            "per-worker and reset on deploy. Set REDIS_URL for a shared limiter "
            "when running more than one worker."
        )
    limiter = Limiter(key_func=_get_client_ip)
