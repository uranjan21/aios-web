import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.deps import ws_auth, require_verified
from app.core.entitlements import require_module, ws_entitled
from app.core.middleware import SecurityHeadersMiddleware, RequestLoggingMiddleware
from app.core.rate_limit import limiter

from app.api.auth import router as auth_router
from app.api.sync import router as sync_router, sync_ws_handler
from app.api.chat import router as chat_router, chat_ws_handler
from app.api.agents import router as agents_router, agents_ws_handler
from app.services.agents.scheduler import (
    acquire_scheduler_leadership,
    release_scheduler_leadership,
    start_scheduler,
    stop_scheduler,
)
from app.api.integrations import router as integrations_router
from app.api.areas.finance import router as finance_router
from app.api.areas.health import router as health_router
from app.api.areas.career import router as career_router
from app.api.captures import router as captures_router
from app.api.push import router as push_router
from app.api.ai import router as ai_router
from app.api.billing import router as billing_router
from app.api.admin import router as admin_router
from app.api.goals import router as goals_router
from app.api.forecasts import router as forecasts_router
from app.api.insights import router as insights_router
from app.api.automations import router as automations_router
from app.api.workspace import router as workspace_router
from app.api.quotes import router as quotes_router
from app.api.knowledge import router as knowledge_router
def _configure_logging() -> None:
    """JSON structured logging for production; plain text for local dev."""
    import sys
    try:
        from pythonjsonlogger.json import JsonFormatter
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            JsonFormatter("%(asctime)s %(name)s %(levelname)s %(message)s %(request_id)s")
        )
        root = logging.getLogger()
        root.handlers = [handler]
        root.setLevel(logging.INFO)
    except ImportError:
        logging.basicConfig(level=logging.INFO)


_configure_logging()
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
    if settings.environment == "production" and not settings.redis_url:
        raise RuntimeError(
            "REDIS_URL must be set in production for distributed rate limiting across workers. "
            "Start a Redis instance and set REDIS_URL=redis://host:6379/0"
        )
    if settings.environment == "production" and not settings.allowed_origin.startswith("https://"):
        logger.warning(
            "ALLOWED_ORIGIN is not https:// (%s) — the auth cookie is sent WITHOUT the "
            "Secure flag and all traffic, including JWTs, is in cleartext. Put a domain "
            "in front of this deployment and switch to https as soon as possible.",
            settings.allowed_origin,
        )

    logger.info("AIOS Web backend starting — vault: %s", settings.vault_path)

    # Exactly one worker runs cron jobs + the seed backfill — otherwise every
    # autoscaled worker fires every agent (duplicate LLM spend + pushes).
    is_leader = False
    try:
        is_leader = await acquire_scheduler_leadership()
    except Exception as e:
        logger.error("Scheduler leader election failed (this worker runs without cron jobs): %s", e)

    if is_leader:
        logger.info("SCHEDULER LEADER: this worker runs cron jobs and agent seeding")
        # Backfill default agents for existing users BEFORE the scheduler loads
        # active agents, so new default agents get cron-registered on first boot.
        try:
            from app.api.agents import seed_default_agents
            await seed_default_agents()
        except Exception as e:
            logger.error("Default agent seeding failed (non-fatal): %s", e)

        await start_scheduler()
    else:
        logger.info("Scheduler not started — another worker holds the leader lock")

    from pathlib import Path
    vault_path = Path(settings.vault_path)
    # Vault sync is single-tenant: one shared filesystem, NOT isolated per user.
    # Leaving it on in a hosted multi-tenant deployment leaks every user's vault
    # to every other user. Refuse to start it in production unless explicitly
    # acknowledged, so a forgotten env var can't cause a cross-tenant data leak.
    if settings.vault_sync_enabled and settings.environment == "production" and not settings.vault_single_tenant_ack:
        raise RuntimeError(
            "REFUSING TO START: VAULT_SYNC_ENABLED=true in production. Vault sync "
            "is single-tenant and shares one filesystem across ALL users — this "
            "leaks data in a multi-tenant SaaS. Set VAULT_SYNC_ENABLED=false for "
            "hosted multi-tenant, or VAULT_SINGLE_TENANT_ACK=true if this is a "
            "deliberate single-tenant/self-host production deployment."
        )
    if not settings.vault_sync_enabled:
        logger.info("Vault sync disabled (VAULT_SYNC_ENABLED=false) — watcher not started")
    elif vault_path.exists():
        from app.services.vault_sync.watcher import VaultWatcher
        from app.services.vault_sync.sync_engine import handle_file_change
        from app.db.session import AsyncSessionLocal
        from app.models.user import User
        from sqlmodel import select as sql_select

        async def _get_vault_user_id():
            """Return the vault owner's id.

            VAULT_OWNER_EMAIL pins the vault to a specific user and removes
            the fragility of relying on creation order (e.g. when a secondary
            admin account is created before the real owner).
            """
            async with AsyncSessionLocal() as s:
                if settings.vault_owner_email:
                    result = await s.execute(
                        sql_select(User).where(User.email == settings.vault_owner_email)
                    )
                else:
                    result = await s.execute(
                        sql_select(User).order_by(User.created_at).limit(1)
                    )
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
    await release_scheduler_leadership()


def create_app() -> FastAPI:
    settings = get_settings()

    # Error reporting — no-op unless SENTRY_DSN is set. Init before the app so
    # exceptions during startup are captured too.
    from app.core.observability import init_sentry
    init_sentry()

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
        logger.error("Unhandled exception: %s", exc, exc_info=True)
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
    @limiter.limit("30/minute")
    async def health(request: Request):
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
                "service": "control-tower",
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
        # Mirror require_verified — the HTTP gate must not be bypassable over WS.
        if not user.get("email_verified", True):
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
        if not user.get("email_verified", True):
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
    _verified = Depends(require_verified)
    app.include_router(chat_router, dependencies=[Depends(require_module("chat")), _verified])
    app.include_router(agents_router, dependencies=[Depends(require_module("agents")), _verified])
    app.include_router(integrations_router, dependencies=[Depends(require_module("integrations")), _verified])
    app.include_router(knowledge_router, dependencies=[Depends(require_module("integrations")), _verified])
    app.include_router(finance_router, dependencies=[Depends(require_module("finance")), _verified])
    app.include_router(health_router, dependencies=[Depends(require_module("health")), _verified])
    app.include_router(career_router, dependencies=[Depends(require_module("career")), _verified])
    app.include_router(captures_router, dependencies=[_verified])
    app.include_router(push_router)  # push subscriptions don't require verified email
    app.include_router(ai_router, dependencies=[_verified])
    app.include_router(billing_router)  # webhook endpoint has no auth
    app.include_router(admin_router)    # admin already requires is_admin; admins are always verified
    app.include_router(goals_router, dependencies=[_verified])
    app.include_router(forecasts_router, dependencies=[_verified])
    app.include_router(insights_router, dependencies=[_verified])
    app.include_router(automations_router, dependencies=[_verified])
    app.include_router(workspace_router, dependencies=[_verified])
    app.include_router(quotes_router, dependencies=[_verified])
    return app


app = create_app()
