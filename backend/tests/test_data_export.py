"""GET /auth/me/export — the counterpart to account deletion.

The contract that matters here is not "it returns data" but "it never returns a
credential". The export is a file the user downloads and may forward, store in a
cloud drive, or hand to a support agent; anything in it that can act as the user
is a live exfiltration path, so the exclusion list is tested by NAME rather than
by inspecting one fixture's rows.
"""
import pytest

from app.api.auth import _EXPORT_DENY_COLUMNS, _EXPORT_DENY_TABLES, _jsonable


@pytest.mark.asyncio
async def test_export_requires_auth(client):
    res = await client.get("/api/auth/me/export")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_export_returns_the_users_own_account(client_a):
    # `client_a`, not `auth_client`: the latter signs in through the legacy dev
    # credential path, which mints a token WITHOUT creating a users row, so it
    # has no profile to export.
    res = await client_a.get("/api/auth/me/export")
    assert res.status_code == 200

    body = res.json()
    assert set(body) >= {"exported_at", "account", "row_counts", "data"}
    assert body["account"]["id"]
    # The profile itself rides in the users table, not a duplicated header field.
    assert body["data"]["users"][0]["email"]
    # A downloaded file must announce itself as one.
    assert "attachment" in res.headers.get("content-disposition", "")


@pytest.mark.asyncio
async def test_export_never_includes_credentials(client_a):
    """No denied column name may appear anywhere in the payload."""
    res = await client_a.get("/api/auth/me/export")
    assert res.status_code == 200

    for table, rows in res.json()["data"].items():
        assert table not in _EXPORT_DENY_TABLES
        for row in rows:
            leaked = _EXPORT_DENY_COLUMNS & set(row)
            assert not leaked, f"{table} leaked {leaked} into the export"


@pytest.mark.asyncio
async def test_export_is_scoped_to_the_caller(client_a, client_b):
    """Two accounts must not see each other's rows — the same guarantee the rest
    of the isolation suite enforces, on a route that reads EVERY table at once."""
    a = (await client_a.get("/api/auth/me/export")).json()
    b = (await client_b.get("/api/auth/me/export")).json()

    assert a["account"]["id"] != b["account"]["id"]
    assert a["data"]["users"][0]["id"] == a["account"]["id"]
    assert b["data"]["users"][0]["id"] == b["account"]["id"]
    assert len(a["data"]["users"]) == 1


def test_money_survives_the_round_trip_exactly():
    """Decimal -> str, never float: these are money columns and float() rounds."""
    import decimal

    assert _jsonable(decimal.Decimal("1234.56")) == "1234.56"
    assert _jsonable(decimal.Decimal("0.1")) == "0.1"


def test_binary_columns_are_dropped_not_crashed():
    assert _jsonable(b"\x00\x01") is None
