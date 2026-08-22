"""BYOK — every LLM call runs on the calling user's own provider key.

The product spends nothing on anyone's behalf, so the properties worth pinning
are: the key is stored encrypted and never handed back; an interactive AI call
without a key says so instead of failing obscurely; a scheduled job without a
key degrades instead of raising; and one user's key is unreachable from another
account.

No network: every provider client is monkeypatched.
"""
import uuid

import pytest
import pytest_asyncio
from sqlmodel import select

from tests.conftest import TestSessionLocal, _test_engine


@pytest_asyncio.fixture(scope="module", autouse=True)
async def _api_key_table(_schema):
    """conftest's table list predates `user_api_keys`; create it for this module."""
    from app.models.api_keys import UserApiKey

    async with _test_engine.begin() as conn:
        await conn.run_sync(
            lambda c: UserApiKey.__table__.create(c, checkfirst=True)
        )
    yield


async def _install_key(user_id, provider: str, raw: str) -> None:
    from app.services.ai.keys import set_user_api_key

    async with TestSessionLocal() as session:
        await set_user_api_key(session, user_id, provider, raw)


# ── storage ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_put_key_stores_encrypted_and_never_returns_plaintext(client_a, user_a):
    from app.models.api_keys import UserApiKey

    secret = "sk-test-abcdefghijklmnop1234"
    resp = await client_a.put("/api/keys/openai", json={"api_key": secret})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert secret not in resp.text
    assert body["key_hint"] == secret[-4:]

    async with TestSessionLocal() as session:
        row = (await session.execute(
            select(UserApiKey).where(UserApiKey.user_id == user_a.id)
        )).scalar_one()
    # Ciphertext at rest, not the key.
    assert row.key_encrypted != secret
    assert secret not in row.key_encrypted

    # ...and it still decrypts back to the original for the call sites.
    from app.services.ai.keys import get_user_api_key
    async with TestSessionLocal() as session:
        assert await get_user_api_key(session, user_a.id, "openai") == secret


@pytest.mark.asyncio
async def test_get_returns_hints_only(client_a, user_a):
    secret = "sk-test-zyxwvutsrqponm9876"
    await client_a.put("/api/keys/anthropic", json={"api_key": secret})

    resp = await client_a.get("/api/keys")
    assert resp.status_code == 200
    assert resp.json() == {"anthropic": secret[-4:]}
    assert secret not in resp.text


@pytest.mark.asyncio
async def test_unknown_provider_is_rejected(client_a):
    resp = await client_a.put("/api/keys/deepmind", json={"api_key": "x" * 20})
    assert resp.status_code == 422
    assert (await client_a.delete("/api/keys/deepmind")).status_code == 422


@pytest.mark.asyncio
async def test_delete_removes_the_key(client_a, user_a):
    await client_a.put("/api/keys/openai", json={"api_key": "sk-test-deleteme-000011"})
    assert (await client_a.delete("/api/keys/openai")).status_code == 200
    assert (await client_a.get("/api/keys")).json().get("openai") is None
    # Second delete has nothing to remove.
    assert (await client_a.delete("/api/keys/openai")).status_code == 404


# ── isolation ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_one_user_cannot_read_or_use_another_users_key(client_a, client_b, user_a, user_b):
    secret = "sk-test-only-mine-4444abcd"
    await _install_key(user_a.id, "openai", secret)

    # B cannot see it...
    listing = await client_b.get("/api/keys")
    assert listing.json() == {}
    assert secret not in listing.text
    # ...cannot delete it...
    assert (await client_b.delete("/api/keys/openai")).status_code == 404
    # ...and cannot make a call resolve to it.
    from app.services.ai.keys import get_user_api_key
    async with TestSessionLocal() as session:
        assert await get_user_api_key(session, user_b.id, "openai") is None
        assert await get_user_api_key(session, user_a.id, "openai") == secret

    # B overwriting "openai" touches only B's own row.
    await client_b.put("/api/keys/openai", json={"api_key": "sk-test-b-key-99998888"})
    async with TestSessionLocal() as session:
        assert await get_user_api_key(session, user_a.id, "openai") == secret


# ── interactive paths ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ai_endpoint_428s_when_no_key_configured(client_a):
    resp = await client_a.post("/api/ai/skill-gap", json={"target_role": "Staff Engineer"})
    assert resp.status_code == 428
    detail = resp.json()["detail"]
    assert detail["error"] == "no_api_key"
    assert detail["provider"] in ("openai", "anthropic")


@pytest.mark.asyncio
async def test_ai_endpoint_runs_on_the_users_own_key(client_a, user_a, monkeypatch):
    await _install_key(user_a.id, "openai", "sk-test-mine-1234567890ab")

    seen = {}

    class _Completions:
        async def create(self, **kwargs):
            class _Msg:
                content = "- one insight"

            class _Choice:
                message = _Msg()

            class _Resp:
                choices = [_Choice()]

            return _Resp()

    class _Client:
        class chat:
            completions = _Completions()

    def _fake_get_client(api_key, **kw):
        seen["api_key"] = api_key
        return _Client()

    from app.services.ai import insights
    monkeypatch.setattr(insights, "get_openai_client", _fake_get_client)

    resp = await client_a.post("/api/ai/skill-gap", json={"target_role": "Staff Engineer"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["text"] == "- one insight"
    # The call was made with THIS user's key, not a server key.
    assert seen["api_key"] == "sk-test-mine-1234567890ab"


@pytest.mark.asyncio
async def test_capture_parse_flags_the_missing_key_instead_of_breaking(client_a):
    """Quick-log still saves the note; it just tells the client a key is needed."""
    resp = await client_a.post("/api/captures/parse", json={"text": "Coffee 200"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["domain"] == "capture"
    assert body["needs_api_key"] == "openai"


@pytest.mark.asyncio
async def test_agent_trigger_428s_without_a_key(client_a, user_a):
    from app.models.agent import Agent

    async with TestSessionLocal() as session:
        session.add(Agent(
            task_id="aios-morning-brief", name="Morning Brief",
            cron_expression="0 6 * * *", user_id=user_a.id, is_active=True,
        ))
        await session.commit()

    resp = await client_a.post("/api/agents/aios-morning-brief/trigger")
    assert resp.status_code == 428
    assert resp.json()["detail"]["error"] == "no_api_key"


# ── background paths ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_run_degrades_to_facts_only_without_a_key(user_a, monkeypatch):
    """A scheduled run must not raise, retry-storm, or call a provider."""
    from app.services.agents import runners

    async def _facts(task_id, user_id):
        return ("Yesterday: 1 workout.", True)

    async def _boom(*a, **kw):
        raise AssertionError("generate_text must not be called without a key")

    monkeypatch.setattr(runners, "_build_context", _facts)
    monkeypatch.setattr(runners, "generate_text", _boom)
    monkeypatch.setattr(runners, "send_push_to_all", lambda *a, **kw: None)

    out = await runners.run_agent_task("aios-morning-brief", user_a.id)
    assert runners.FALLBACK_WARNING_PREFIX in out
    assert "Yesterday: 1 workout." in out


@pytest.mark.asyncio
async def test_vault_extraction_no_ops_without_a_key(user_a, monkeypatch):
    from app.services.vault_sync import extractor

    async def _boom(*a, **kw):
        raise AssertionError("generate_text must not be called without a key")

    monkeypatch.setattr(extractor, "generate_text", _boom)
    # Returns quietly rather than raising out of the scheduler.
    assert await extractor.run_daily_vault_extraction(user_a.id) is None


@pytest.mark.asyncio
async def test_generate_text_raises_missing_key_for_a_keyless_user(user_a):
    from app.services.ai.insights import generate_text
    from app.services.ai.keys import UserApiKeyMissing

    with pytest.raises(UserApiKeyMissing):
        await generate_text("sys", "facts", user_id=str(user_a.id))


@pytest.mark.asyncio
async def test_generate_text_falls_back_to_the_provider_the_user_actually_has(user_a, monkeypatch):
    """A stale `openai` preference must not fail a user who only installed Anthropic."""
    await _install_key(user_a.id, "anthropic", "sk-ant-test-1234567890abcd")

    seen = {}

    class _Messages:
        async def create(self, **kwargs):
            class _Block:
                type = "text"
                text = "claude said so"

            class _Resp:
                content = [_Block()]

            return _Resp()

    class _Client:
        messages = _Messages()

    def _fake(api_key, **kw):
        seen["api_key"] = api_key
        return _Client()

    from app.services.ai import insights
    monkeypatch.setattr(insights, "get_anthropic_client", _fake)

    out = await insights.generate_text(
        "sys", "facts", user_id=str(user_a.id), override_provider="openai"
    )
    assert out == "claude said so"
    assert seen["api_key"] == "sk-ant-test-1234567890abcd"
