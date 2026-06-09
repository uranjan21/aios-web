import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.middleware import SecurityHeadersMiddleware, RequestLoggingMiddleware
from app.core.rate_limit import limiter

from app.api.auth import router as auth_router
from app.api.sync import router as sync_router, sync_ws_handler
from app.api.chat import router as chat_router, chat_ws_handler
from app.api.agents import router as agents_router, agents_ws_handler, seed_default_agents
from app.api.integrations import router as integrations_router
from app.api.areas.finance import router as finance_router
from app.api.areas.health import router as health_router
from app.api.areas.career import router as career_router
from app.api.areas.business import router as business_router
from app.api.areas.content import router as content_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("AIOS Web backend starting — vault: %s", settings.vault_path)

    await seed_default_agents()

    # Start vault file watcher
    from pathlib import Path
    vault_path = Path(settings.vault_path)
    if vault_path.exists():
        from app.services.vault_sync.watcher import VaultWatcher
        from app.services.vault_sync.sync_engine import handle_file_change

        watcher = VaultWatcher(settings.vault_path, handle_file_change)
        loop = asyncio.get_event_loop()
        watcher.start(loop)
        logger.info("Vault watcher started")
    else:
        logger.warning("VAULT_PATH does not exist: %s — watcher not started", settings.vault_path)
        watcher = None

    yield

    if watcher:
        watcher.stop()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="AIOS Web",
        description="Personal command center on top of AI OS",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Middleware (order matters — outermost first)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.allowed_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health check
    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "aios-web"}

    # WebSocket routes
    @app.websocket("/ws/sync")
    async def ws_sync(websocket: WebSocket):
        await sync_ws_handler(websocket)

    @app.websocket("/ws/chat")
    async def ws_chat(websocket: WebSocket):
        await chat_ws_handler(websocket)

    @app.websocket("/ws/agents")
    async def ws_agents(websocket: WebSocket):
        await agents_ws_handler(websocket)

    # REST routers
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

    return app


app = create_app()
