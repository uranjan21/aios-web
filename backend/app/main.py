import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.deps import ws_auth
from app.core.middleware import SecurityHeadersMiddleware, RequestLoggingMiddleware
from app.core.rate_limit import limiter

from app.api.auth import router as auth_router
from app.api.sync import router as sync_router, sync_ws_handler
from app.api.chat import router as chat_router, chat_ws_handler
from app.api.agents import router as agents_router, agents_ws_handler, seed_default_agents
from app.services.agents.scheduler import start_scheduler, stop_scheduler
from app.api.integrations import router as integrations_router
from app.api.areas.finance import router as finance_router
from app.api.areas.health import router as health_router
from app.api.areas.career import router as career_router
from app.api.areas.business import router as business_router
from app.api.areas.content import router as content_router
from app.api.captures import router as captures_router
from app.api.push import router as push_router
from app.api.ai import router as ai_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_WEAK_SECRETS = {"change-me-in-production", "changeme", "secret", ""}

_watcher = None  # module-level reference for health check


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _watcher
    settings = get_settings()

    if settings.app_secret_key in _WEAK_SECRETS:
        logger.warning("APP_SECRET_KEY is using an insecure default — set it before production use")
    if settings.app_password in _WEAK_SECRETS:
        logger.warning("APP_PASSWORD is using an insecure default — set it before production use")

    logger.info("AIOS Web backend starting — vault: %s", settings.vault_path)

    try:
        await seed_default_agents()
    except Exception as e:
        logger.warning("Failed to seed default agents (non-fatal): %s", e)

    await start_scheduler()

    from pathlib import Path
    vault_path = Path(settings.vault_path)
    if vault_path.exists():
        from app.services.vault_sync.watcher import VaultWatcher
        from app.services.vault_sync.sync_engine import handle_file_change

        _watcher = VaultWatcher(settings.vault_path, handle_file_change)
        loop = asyncio.get_running_loop()
        _watcher.start(loop)
        logger.info("Vault watcher started")

        async def _initial_scan():
            count = 0
            for md_file in vault_path.rglob("*.md"):
                rel = str(md_file.relative_to(vault_path))
                await handle_file_change(rel, "modified")
                count += 1
            logger.info("Initial vault scan complete: %d files", count)

        scan_task = asyncio.create_task(_initial_scan())
        scan_task.add_done_callback(
            lambda t: logger.error("Initial vault scan failed: %s", t.exception())
            if not t.cancelled() and t.exception() else None
        )
    else:
        logger.warning("VAULT_PATH does not exist: %s — watcher not started", settings.vault_path)

    yield

    if _watcher:
        _watcher.stop()
    stop_scheduler()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="AIOS Web",
        description="Personal command center on top of AI OS",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred. Our team has been notified."
                }
            }
        )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.allowed_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Cookie", "X-Requested-With"],
    )

    @app.get("/health")
    @app.get("/api/health")
    async def health():
        from sqlalchemy import text
        from app.db.session import engine
        db_ok = False
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            db_ok = True
        except Exception as e:
            logger.error("Health check DB failure: %s", e)

        status_str = "ok" if db_ok else "degraded"
        return JSONResponse(
            {
                "status": status_str,
                "service": "aios-web",
                "db": db_ok,
                "watcher": _watcher is not None,
            },
            status_code=200 if db_ok else 503,
        )

    @app.websocket("/ws/sync")
    async def ws_sync(websocket: WebSocket):
        user = await ws_auth(websocket)
        if not user:
            await websocket.close(code=1008)
            return
        await sync_ws_handler(websocket)

    @app.websocket("/ws/chat")
    async def ws_chat(websocket: WebSocket):
        user = await ws_auth(websocket)
        if not user:
            await websocket.close(code=1008)
            return
        await chat_ws_handler(websocket)

    @app.websocket("/ws/agents")
    async def ws_agents(websocket: WebSocket):
        user = await ws_auth(websocket)
        if not user:
            await websocket.close(code=1008)
            return
        await agents_ws_handler(websocket)

    app.include_router(auth_router)
    app.include_router(sync_router)
    app.include_router(chat_router)
    app.include_router(agents_router)
    app.include_router(integrations_router)
    app.include_router(finance_router)
    app.include_router(health_router)
    app.include_router(career_router)
    app.include_router(business_router)
    app.include_router(content_router)
    app.include_router(captures_router)
    app.include_router(push_router)
    app.include_router(ai_router)

    return app


app = create_app()
