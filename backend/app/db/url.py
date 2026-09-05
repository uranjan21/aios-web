"""Normalize a DATABASE_URL into something the asyncpg driver actually accepts.

SQLAlchemy's asyncpg dialect forwards every URL query parameter straight to
`asyncpg.connect()` (it pops only its own four). asyncpg is not libpq: it has no
`sslmode`, no `channel_binding`, no `application_name`. So the connection URI a
managed provider hands you — Supabase, Neon, Railway all print libpq-style URIs —
raises `TypeError: connect() got an unexpected keyword argument 'sslmode'` at the
first query, long after the process looked like it started fine.

This module translates what can be translated, drops what cannot, and returns
explicit connect_args. It also handles the other half of the managed-Postgres
problem: connection poolers in transaction mode (Supabase's Supavisor on port
6543, PgBouncer) multiplex one server connection across clients, so a prepared
statement made for one client is not there for the next. asyncpg prepares
statements implicitly and hits
`DuplicatePreparedStatementError: prepared statement "__asyncpg_stmt_1__" already
exists`. Disabling both statement caches and giving each prepared statement a
unique name is the documented fix.
"""
import logging
import uuid
from typing import Any

from sqlalchemy.engine import URL, make_url

logger = logging.getLogger(__name__)

# Keyword arguments `asyncpg.connect()` accepts, plus the four the SQLAlchemy
# dialect consumes before calling it. Anything outside this set reaches asyncpg
# as an unexpected keyword and raises.
_ASYNCPG_CONNECT_ARGS = {
    "command_timeout",
    "connection_class",
    "database",
    "direct_tls",
    "host",
    "max_cacheable_statement_size",
    "max_cached_statement_lifetime",
    "passfile",
    "password",
    "port",
    "record_class",
    "server_settings",
    "ssl",
    "statement_cache_size",
    "target_session_attrs",
    "timeout",
    "user",
    # Consumed by the dialect itself, never forwarded to asyncpg.
    "prepared_statement_cache_size",
    "prepared_statement_name_func",
    "async_fallback",
    "async_creator_fn",
}

# libpq parameters with no asyncpg equivalent. Silently dropping them is correct:
# they describe client-library behaviour, not the connection the server sees.
_LIBPQ_ONLY = {
    "channel_binding",
    "connect_timeout",
    "gssencmode",
    "keepalives",
    "keepalives_count",
    "keepalives_idle",
    "keepalives_interval",
    "sslcert",
    "sslcompression",
    "sslkey",
    "sslrootcert",
    "target_session_attrs_libpq",
}

# The port Supabase's Supavisor serves transaction-mode pooling on. Session mode
# (5432) keeps one server connection per client and needs none of this.
_TRANSACTION_POOLER_PORTS = {6543}

_TRUTHY = {"1", "true", "yes", "on", "require", "required"}


def _is_truthy(value: Any) -> bool:
    return str(value).strip().lower() in _TRUTHY


def normalize_database_url(raw_url: str) -> tuple[URL, dict]:
    """Split a DATABASE_URL into a clean URL plus asyncpg connect_args.

    Returns the URL with every query parameter stripped, so nothing can leak
    through to the driver unvetted, and the connect_args to pass alongside it.
    Non-asyncpg URLs (SQLite under test) are returned untouched.
    """
    url = make_url(raw_url)
    if not url.drivername.startswith("postgresql+asyncpg"):
        return url, {}

    query = dict(url.query)
    connect_args: dict[str, Any] = {}
    server_settings: dict[str, str] = {}
    pooled = url.port in _TRANSACTION_POOLER_PORTS
    dropped: list[str] = []

    for key, value in query.items():
        # libpq's sslmode and asyncpg's ssl take the same vocabulary
        # ("require", "verify-full", ...), so this is a rename, not a downgrade.
        if key in ("sslmode", "ssl"):
            connect_args["ssl"] = value
        elif key == "pgbouncer":
            # Prisma's convention for "this endpoint is a transaction pooler".
            if _is_truthy(value):
                pooled = True
        elif key == "application_name":
            # asyncpg has no such kwarg; the server-side setting does the job.
            server_settings["application_name"] = str(value)
        elif key in _ASYNCPG_CONNECT_ARGS:
            connect_args[key] = value
        elif key in _LIBPQ_ONLY:
            dropped.append(key)
        else:
            dropped.append(key)

    if dropped:
        logger.warning(
            "Dropped DATABASE_URL parameter(s) asyncpg does not accept: %s. "
            "They would have raised TypeError on the first connection.",
            ", ".join(sorted(dropped)),
        )

    if server_settings:
        connect_args["server_settings"] = server_settings

    if pooled:
        # A transaction pooler hands each transaction whichever server
        # connection is free, so a prepared statement cached against one is
        # absent (or worse, name-colliding) on the next.
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_cache_size"] = 0
        connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid.uuid4()}__"
        logger.info(
            "Transaction-mode connection pooler detected (port %s) — statement "
            "caching disabled and prepared statement names randomized.",
            url.port,
        )

    return url.difference_update_query(list(query)), connect_args
