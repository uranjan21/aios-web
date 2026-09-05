"""GDPR data export (S14).

The three properties that matter are tenant isolation, secret exclusion and the
metadata-derived table set — see `app/api/data_export.py`.
"""
import json

import pytest
import pytest_asyncio

from app.api.data_export import exportable_tables, is_secret_column


@pytest_asyncio.fixture(autouse=True)
async def _export_endpoint(app):
    """Mount the router if `main.py` hasn't yet (it is another agent's file), and
    switch the limiter off — the endpoint is 2/hour and the in-memory counter is
    shared for the whole session, so the second test would 429 on a limit that
    isn't what any of this is testing."""
    from app.api.data_export import router as export_router
    from app.core.rate_limit import limiter

    if not any(getattr(r, "path", None) == "/api/export" for r in app.routes):
        app.include_router(export_router)

    was = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = was


async def _export(client) -> dict:
    resp = await client.get("/api/export")
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"].startswith("application/json")
    return json.loads(resp.text)


@pytest.mark.asyncio
async def test_export_requires_auth(client):
    resp = await client.get("/api/export")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_export_returns_only_the_callers_rows(
    client_a, client_b, user_a, user_b, db_session_factory
):
    from app.models.quote import SavedQuote

    async with db_session_factory() as s:
        s.add(SavedQuote(user_id=user_a.id, text="a-owned quote", author="A"))
        s.add(SavedQuote(user_id=user_b.id, text="b-owned quote", author="B"))
        await s.commit()

    doc = await _export(client_a)

    assert doc["export_version"] == 1
    assert doc["user_id"] == str(user_a.id)
    assert doc["user"]["email"] == user_a.email

    quotes = doc["tables"]["saved_quotes"]
    texts = {q["text"] for q in quotes}
    assert "a-owned quote" in texts
    assert "b-owned quote" not in texts
    # And nothing anywhere in the document mentions the other tenant.
    assert str(user_b.id) not in json.dumps(doc)


@pytest.mark.asyncio
async def test_export_never_includes_secrets(client_a, user_a, db_session_factory):
    from app.models.integration import IntegrationCredential

    async with db_session_factory() as s:
        s.add(
            IntegrationCredential(
                user_id=user_a.id,
                provider="gcal",
                account_email="",
                access_token_encrypted="SUPER-SECRET-ACCESS",
                refresh_token_encrypted="SUPER-SECRET-REFRESH",
                status="connected",
            )
        )
        await s.commit()

    doc = await _export(client_a)
    raw = json.dumps(doc)

    creds = doc["tables"]["integration_credentials"]
    assert len(creds) == 1
    assert creds[0]["provider"] == "gcal"
    assert "access_token_encrypted" not in creds[0]
    assert "refresh_token_encrypted" not in creds[0]
    assert "SUPER-SECRET" not in raw

    # The profile row is an allowlist — no hash, no verification/reset tokens.
    for banned in (
        "password_hash",
        "email_verification_token",
        "password_reset_token",
        "token_version",
    ):
        assert banned not in doc["user"]
        assert banned not in raw


def test_secret_columns_are_excluded_by_suffix_not_by_hand():
    """A new `*_encrypted` column must be withheld without editing this file."""
    assert is_secret_column("key_encrypted")
    assert is_secret_column("access_token_encrypted")
    assert is_secret_column("some_future_thing_encrypted")
    assert is_secret_column("password_hash")
    assert not is_secret_column("key_hint")
    assert not is_secret_column("provider")


def test_exportable_tables_are_derived_from_orm_metadata():
    tables = exportable_tables()
    names = {t.name for t in tables}

    # Derived, not listed: every table carrying user_id is in, and only those.
    assert all("user_id" in t.columns for t in tables)
    assert "users" not in names
    assert {"saved_quotes", "integration_credentials"} <= names
    assert len(names) > 40  # the schema is ~76 tables; most carry user_id


def test_secret_columns_are_dropped_from_every_exported_table():
    for table in exportable_tables():
        for column in table.columns:
            if column.name.endswith("_encrypted"):
                assert is_secret_column(column.name), (
                    f"{table.name}.{column.name} would be exported"
                )
