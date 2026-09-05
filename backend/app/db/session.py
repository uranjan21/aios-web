from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.url import normalize_database_url

settings = get_settings()

# The URL a managed provider prints is libpq-flavoured; asyncpg is not libpq.
# normalize_database_url() translates what it can and strips the rest, and turns
# on the transaction-pooler workarounds when the endpoint needs them.
_url, _connect_args = normalize_database_url(settings.database_url)

_engine_kwargs: dict = {
    "echo": False,
    "connect_args": _connect_args,
}

# Pool sizing is a QueuePool concept. The test suite runs on SQLite, which uses
# StaticPool, and create_engine rejects these arguments outright there rather
# than ignoring them.
if _url.drivername.startswith("postgresql"):
    _engine_kwargs.update(
        # A managed Postgres closes idle connections server-side (Supabase does
        # so aggressively), leaving dead sockets in the pool. pool_pre_ping
        # spends one round trip to find out instead of failing a user request.
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        # Recycle below any provider-side idle timeout so we close first.
        pool_recycle=settings.db_pool_recycle_seconds,
    )

engine = create_async_engine(_url, **_engine_kwargs)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
