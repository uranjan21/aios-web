import logging
import secrets
import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)


def _build_csp(allowed_origin: str, connect_extra: str = "") -> str:
    """Content-Security-Policy for BOTH the SPA document and the API responses.

    This process serves both, so there is one policy. It is the stricter of the
    two that used to exist — the edge proxy's — with the font hosts kept:

    * script-src has NO 'unsafe-inline'. index.html carries no inline script and
      Vite emits every module as a file, so the API's old policy was loosening
      the most valuable directive for nothing.
    * style-src needs 'unsafe-inline' for styled-components' injected <style>,
      and fonts.googleapis.com for the webfont stylesheet index.html links.
    * font-src needs fonts.gstatic.com — the DM Sans and Playfair files
      themselves. Drop it and the whole type system silently falls back to
      system UI, which looks like a design regression, not a CSP error.
    * connect-src 'self' already covers same-origin ws:// and wss:// under CSP
      Level 3, but the explicit origin is kept for older implementations.
      CSP_CONNECT_EXTRA is where a Sentry ingest host or PostHog goes; neither
      is allowed by default.
    """
    ws_origin = allowed_origin.replace("https://", "wss://").replace("http://", "ws://")
    connect = f"'self' {ws_origin} https://ipapi.co https://open.er-api.com"
    if connect_extra.strip():
        connect = f"{connect} {connect_extra.strip()}"
    return (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "img-src 'self' data: blob: https:; "
        f"connect-src {connect}; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "object-src 'none'"
    )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        from app.core.config import get_settings
        settings = get_settings()
        self._csp = _build_csp(settings.allowed_origin, settings.csp_connect_extra)
        self._production = settings.environment == "production"

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        # frame-ancestors in the CSP is the modern control; this is the fallback
        # for browsers that predate it. A financial app must not be iframeable.
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        )
        response.headers["Content-Security-Policy"] = self._csp
        # X-XSS-Protection is deliberately absent. The header is deprecated, no
        # current browser honours it, and its filter was itself exploitable —
        # OWASP now advises against sending "1; mode=block". The CSP above is
        # what actually mitigates injection here.
        if self._production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or secrets.token_hex(8)
        request.state.request_id = request_id

        start = time.monotonic()
        response = await call_next(request)
        duration_ms = (time.monotonic() - start) * 1000

        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s %d %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={"request_id": request_id},
        )
        return response
