"""Serve the built single-page app from the API process.

The app is deployed as ONE service: the SPA and the API share an origin. That
is not a preference, it is what the frontend requires — packages/shared uses a
relative `/api` baseURL and the WebSocket hooks dial `location.host`, and the
auth cookie is SameSite=Strict. Split them across two hosts and login breaks.

On a VPS a Caddy container provided that origin. A PaaS gives one container one
port, so the API process serves the static bundle itself and the topology holds
with nothing in front of it.
"""
import logging
from pathlib import Path

from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse, Response
from starlette.staticfiles import StaticFiles
from starlette.types import Receive, Scope, Send

logger = logging.getLogger(__name__)

# Vite emits content-hashed filenames here, so they can never go stale.
_IMMUTABLE_PREFIX = "/assets/"
_IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
# index.html must never be cached or a deploy leaves clients pinned to the old
# bundle, requesting asset hashes the server no longer has.
_NO_CACHE = "no-cache, must-revalidate"

# Paths that belong to the API, never to the client router. A miss under one of
# these is a 404, not the shell: handing back `200 text/html` for an endpoint
# that does not exist makes the frontend's JSON parse fail somewhere far from
# the actual cause, and hides a routing regression behind a page that renders.
_API_PREFIXES = ("/api/", "/ws/")
_API_EXACT = ("/api", "/ws", "/health")


class SpaStaticFiles(StaticFiles):
    """StaticFiles that falls back to index.html so client routes survive reload.

    React Router owns everything under /app. Without this, refreshing
    /app/finance is a hard 404 — the server has no such file.
    """

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # Reject API paths here rather than in get_response, because StaticFiles
        # refuses any method but GET/HEAD before get_response is ever reached —
        # so a POST to a removed endpoint would answer 405 instead of 404.
        path = scope.get("path", "")
        if path.startswith(_API_PREFIXES) or path in _API_EXACT:
            response = JSONResponse({"detail": "Not Found"}, status_code=404)
            await response(scope, receive, send)
            return
        await super().__call__(scope, receive, send)

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
            # An asset request that misses is a genuine 404. Returning the HTML
            # shell for a missing .js would hand the browser a document where it
            # expects a module, and the console error would point nowhere near
            # the real cause.
            if "." in Path(path).name:
                raise
            response = await super().get_response("index.html", scope)

        request_path = scope.get("path", "")
        if request_path.startswith(_IMMUTABLE_PREFIX):
            response.headers["Cache-Control"] = _IMMUTABLE_CACHE
        else:
            response.headers["Cache-Control"] = _NO_CACHE
        return response


def mount_spa(app, dist_dir: str) -> bool:
    """Mount the built SPA at / if it is present. Returns whether it mounted.

    Absent in local development, where Vite serves the frontend on its own port
    and proxies /api here — so a missing directory is normal, not an error.
    """
    dist = Path(dist_dir)
    index = dist / "index.html"
    if not index.is_file():
        logger.info(
            "No SPA bundle at %s — serving API only (normal in local dev, where "
            "the Vite dev server hosts the frontend).",
            dist,
        )
        return False

    # Mounted last so every API route, WebSocket and /health is matched first.
    # Starlette resolves routes in registration order and this one matches "/".
    app.mount("/", SpaStaticFiles(directory=str(dist), html=True), name="spa")
    logger.info("Serving SPA from %s", dist)
    return True
