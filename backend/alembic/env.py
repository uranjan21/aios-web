import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

from app.core.config import get_settings
from app.db.base import SQLModel  # noqa — imports all models
from app.db.url import normalize_database_url

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata

settings = get_settings()

# The engine is built directly from the normalized URL rather than round-tripped
# through config.set_main_option(). Two reasons: alembic.ini is read by
# configparser, which treats '%' in a password as interpolation syntax and
# raises; and the connect_args that make a transaction-mode pooler work cannot
# be expressed in an ini value at all.
_url, _connect_args = normalize_database_url(settings.database_url)
# render_as_string(hide_password=False) — plain str(URL) renders the password
# as "***", which would hand offline mode a URL that cannot authenticate.
config.set_main_option(
    "sqlalchemy.url", _url.render_as_string(hide_password=False).replace("%", "%%")
)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(
        _url,
        poolclass=pool.NullPool,
        connect_args=_connect_args,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
