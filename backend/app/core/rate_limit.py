from slowapi import Limiter
from starlette.requests import Request


def _get_client_ip(request: Request) -> str:
    """Use raw socket address — not spoofable via X-Forwarded-For."""
    if request.client:
        return request.client.host
    return "unknown"


limiter = Limiter(key_func=_get_client_ip)
