"""DATABASE_URL normalization.

These cover the connection strings managed providers actually print. Each case
here is a failure that only shows up against a real hosted database, which is
the worst place to discover it.
"""
import inspect

import asyncpg
import pytest
from sqlalchemy.dialects.postgresql.asyncpg import (
    AsyncAdapt_asyncpg_dbapi,
    PGDialect_asyncpg,
)

from app.db.url import normalize_database_url

SUPABASE_DIRECT = "postgresql+asyncpg://postgres:pw@db.abcdefgh.supabase.co:5432/postgres"
SUPABASE_POOLER = (
    "postgresql+asyncpg://postgres.abcdefgh:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
)


def test_sslmode_is_translated_to_asyncpg_ssl():
    # libpq spells it sslmode; asyncpg only has ssl, and raises TypeError on
    # anything else. Providers all print the libpq spelling.
    _, args = normalize_database_url(f"{SUPABASE_DIRECT}?sslmode=require")
    assert args["ssl"] == "require"
    assert "sslmode" not in args


@pytest.mark.parametrize("mode", ["require", "verify-ca", "verify-full", "prefer", "disable"])
def test_every_sslmode_value_is_one_asyncpg_understands(mode):
    _, args = normalize_database_url(f"{SUPABASE_DIRECT}?sslmode={mode}")
    # asyncpg parses the value through this enum; a name it cannot resolve
    # raises AttributeError deep inside connect().
    from asyncpg.connect_utils import SSLMode

    assert SSLMode.parse(args["ssl"]) is not None


def test_query_params_never_survive_into_the_url():
    # SQLAlchemy's asyncpg dialect forwards leftover query params straight to
    # asyncpg.connect(), so anything left on the URL is a latent TypeError.
    url, _ = normalize_database_url(f"{SUPABASE_DIRECT}?sslmode=require&channel_binding=require")
    assert url.query == {}


def test_transaction_pooler_disables_statement_caching():
    # Supavisor on 6543 multiplexes one server connection across clients, so a
    # cached prepared statement belongs to a connection the next query may not get.
    _, args = normalize_database_url(SUPABASE_POOLER)
    assert args["statement_cache_size"] == 0
    assert args["prepared_statement_cache_size"] == 0


def test_transaction_pooler_randomizes_prepared_statement_names():
    _, args = normalize_database_url(SUPABASE_POOLER)
    name_func = args["prepared_statement_name_func"]
    assert name_func() != name_func(), "colliding names is the bug this prevents"


def test_session_mode_pooler_keeps_statement_caching():
    # Port 5432 is session mode: one server connection per client for its whole
    # life, so prepared statements are safe and worth keeping.
    _, args = normalize_database_url(SUPABASE_DIRECT)
    assert "statement_cache_size" not in args


def test_pgbouncer_flag_marks_the_endpoint_pooled_regardless_of_port():
    _, args = normalize_database_url(f"{SUPABASE_DIRECT}?pgbouncer=true")
    assert args["statement_cache_size"] == 0


def test_application_name_becomes_a_server_setting():
    # asyncpg.connect() has no application_name kwarg; the server-side GUC does
    # the same job and keeps the name visible in pg_stat_activity.
    _, args = normalize_database_url(f"{SUPABASE_DIRECT}?application_name=control-tower")
    assert args["server_settings"] == {"application_name": "control-tower"}


def test_non_postgres_urls_are_untouched():
    url, args = normalize_database_url("sqlite+aiosqlite:///:memory:")
    assert args == {}
    assert str(url) == "sqlite+aiosqlite:///:memory:"


def test_password_survives_normalization():
    url, _ = normalize_database_url(f"{SUPABASE_DIRECT}?sslmode=require")
    assert url.render_as_string(hide_password=False).endswith("@db.abcdefgh.supabase.co:5432/postgres")
    assert url.password == "pw"


def test_every_emitted_connect_arg_is_one_the_driver_accepts():
    """The guard that keeps this module honest as asyncpg evolves.

    SQLAlchemy's dialect pops only its own four kwargs and forwards the rest to
    asyncpg.connect(). So the set we emit must stay a subset of what that
    function accepts, or a deploy dies on its first query.
    """
    dialect_consumed = {
        "async_fallback",
        "async_creator_fn",
        "prepared_statement_cache_size",
        "prepared_statement_name_func",
    }
    accepted = set(inspect.signature(asyncpg.connect).parameters) | dialect_consumed

    emitted: set[str] = set()
    for raw in [
        f"{SUPABASE_DIRECT}?sslmode=verify-full&application_name=ct",
        f"{SUPABASE_POOLER}?sslmode=require&pgbouncer=true&channel_binding=require",
    ]:
        _, args = normalize_database_url(raw)
        emitted |= set(args)

    assert emitted <= accepted, f"asyncpg would reject: {sorted(emitted - accepted)}"

    # And the four we rely on the dialect eating are still eaten by it.
    source = inspect.getsource(AsyncAdapt_asyncpg_dbapi.connect)
    for kwarg in ("prepared_statement_cache_size", "prepared_statement_name_func"):
        assert f'kw.pop(\n            "{kwarg}"' in source or f'kw.pop("{kwarg}"' in source, (
            f"SQLAlchemy no longer consumes {kwarg}; it would now reach asyncpg"
        )
    assert PGDialect_asyncpg is not None
