import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.deps import ws_auth
from app.core.entitlements import require_module, ws_entitled
from app.core.middleware import SecurityHeadersMiddleware, RequestLoggingMiddleware
from app.core.rate_limit import limiter

from app.api.auth import router as auth_router
from app.api.sync import router as sync_router, sync_ws_handler
from app.api.chat import router as chat_router, chat_ws_handler
from app.api.agents import router as agents_router, agents_ws_handler
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
from app.api.billing import router as billing_router
from app.api.admin import router as admin_router

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

    await start_scheduler()

    from pathlib import Path
    vault_path = Path(settings.vault_path)
    if not settings.vault_sync_enabled:
        logger.info("Vault sync disabled (VAULT_SYNC_ENABLED=false) — watcher not started")
    elif vault_path.exists():
        from app.services.vault_sync.watcher import VaultWatcher
        from app.services.vault_sync.sync_engine import handle_file_change
        from app.db.session import AsyncSessionLocal
        from app.models.user import User
        from sqlmodel import select as sql_select

        async def _get_vault_user_id():
            """Return the first registered user's id for vault association."""
            async with AsyncSessionLocal() as s:
                result = await s.execute(sql_select(User).limit(1))
                user = result.scalar_one_or_none()
                return user.id if user else None

        async def _file_change_callback(rel_path: str, change_type: str) -> None:
            uid = await _get_vault_user_id()
            if uid is None:
                return
            await handle_file_change(uid, rel_path, change_type)

        _watcher = VaultWatcher(settings.vault_path, _file_change_callback)
        loop = asyncio.get_running_loop()
        _watcher.start(loop)
        logger.info("Vault watcher started")

        async def _initial_scan():
            uid = await _get_vault_user_id()
            if uid is None:
                logger.info("Initial vault scan skipped — no users registered yet")
                return
            count = 0
            for md_file in vault_path.rglob("*.md"):
                rel = str(md_file.relative_to(vault_path))
                await handle_file_change(uid, rel, "modified")
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

    @app.get("/api/features")
    async def features():
        """Public feature flags so the frontend can hide self-host-only features."""
        return {
            "vault_sync": settings.vault_sync_enabled,
            "billing_enabled": settings.billing_enabled,
            "stripe_publishable_key": settings.stripe_publishable_key,
        }

    @app.websocket("/ws/sync")
    async def ws_sync(websocket: WebSocket):
        if not settings.vault_sync_enabled:
            await websocket.close(code=1008)
            return
        user = await ws_auth(websocket)
        if not user:
            await websocket.close(code=1008)
            return
        await sync_ws_handler(websocket, user["sub"])

    @app.websocket("/ws/chat")
    async def ws_chat(websocket: WebSocket):
        user = await ws_auth(websocket)
        if not user:
            await websocket.close(code=1008)
            return
        if not await ws_entitled(user["sub"], "chat"):
            await websocket.close(code=1008)
            return
        await chat_ws_handler(websocket, user["sub"])

    @app.websocket("/ws/agents")
    async def ws_agents(websocket: WebSocket):
        user = await ws_auth(websocket)
        if not user:
            await websocket.close(code=1008)
            return
        if not await ws_entitled(user["sub"], "agents"):
            await websocket.close(code=1008)
            return
        await agents_ws_handler(websocket, user["sub"])

    app.include_router(auth_router)
    app.include_router(sync_router)
    # Module gating (Phase 0): every area + service router is entitlement-gated
    # server-side. Inert until billing is enabled, so dev/self-host is unchanged.
    app.include_router(chat_router, dependencies=[Depends(require_module("chat"))])
    app.include_router(agents_router, dependencies=[Depends(require_module("agents"))])
    app.include_router(integrations_router, dependencies=[Depends(require_module("integrations"))])
    app.include_router(finance_router, dependencies=[Depends(require_module("finance"))])
    app.include_router(health_router, dependencies=[Depends(require_module("health"))])
    app.include_router(career_router, dependencies=[Depends(require_module("career"))])
    app.include_router(business_router, dependencies=[Depends(require_module("business"))])
    app.include_router(content_router, dependencies=[Depends(require_module("content"))])
    app.include_router(captures_router)
    app.include_router(push_router)
    app.include_router(ai_router)
    app.include_router(billing_router)
    app.include_router(admin_router)

    return app


app = create_app()
