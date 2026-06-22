"""Multi-tenant isolation tests — user A must never see or mutate user B's data.

These guard the C1–C5 fixes (chat, captures, integrations, agents, push). If any
of these fail, a cross-tenant data leak has regressed.
"""
import pytest


# ── helpers ─────────────────────────────────────────────────────────────────

async def _seed_chat_session(factory, user_id, title="secret"):
    from app.models.chat import ChatSession
    async with factory() as s:
        row = ChatSession(user_id=user_id, title=title)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


async def _seed_capture(factory, user_id, text="secret note"):
    from app.models.captures import Capture
    async with factory() as s:
        row = Capture(user_id=user_id, raw_text=text)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


async def _seed_integration(factory, user_id, provider="gcal"):
    from app.models.integration import IntegrationCredential
    async with factory() as s:
        row = IntegrationCredential(user_id=user_id, provider=provider, status="connected")
        s.add(row)
        await s.commit()


async def _seed_agent(factory, user_id, task_id="aios-morning-brief"):
    from app.models.agent import Agent
    async with factory() as s:
        row = Agent(user_id=user_id, task_id=task_id, name="Morning Brief",
                    cron_expression="0 5 * * *", is_active=True)
        s.add(row)
        await s.commit()


# ── chat (C2) ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_list_excludes_other_users(client_a, client_b, user_b, db_session_factory):
    await _seed_chat_session(db_session_factory, user_b.id, title="B private chat")
    resp = await client_a.get("/api/chat/sessions")
    assert resp.status_code == 200
    titles = [s["title"] for s in resp.json()]
    assert "B private chat" not in titles


@pytest.mark.asyncio
async def test_chat_get_other_users_session_is_404(client_a, user_b, db_session_factory):
    sid = await _seed_chat_session(db_session_factory, user_b.id)
    resp = await client_a.get(f"/api/chat/sessions/{sid}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_chat_delete_other_users_session_is_404_and_preserved(client_a, user_b, db_session_factory):
    sid = await _seed_chat_session(db_session_factory, user_b.id)
    resp = await client_a.delete(f"/api/chat/sessions/{sid}")
    assert resp.status_code == 404
    # B's session must still exist
    from app.models.chat import ChatSession
    from sqlmodel import select
    async with db_session_factory() as s:
        still = (await s.execute(select(ChatSession).where(ChatSession.id == sid))).scalar_one_or_none()
    assert still is not None


@pytest.mark.asyncio
async def test_chat_patch_other_users_session_is_404(client_a, user_b, db_session_factory):
    sid = await _seed_chat_session(db_session_factory, user_b.id)
    resp = await client_a.patch(f"/api/chat/sessions/{sid}", json={"title": "hacked"})
    assert resp.status_code == 404


# ── captures (C3) ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_capture_create_succeeds_and_is_owned(client_a, user_a):
    resp = await client_a.post("/api/captures", json={"raw_text": "buy milk"})
    assert resp.status_code == 201
    assert resp.json()["user_id"] == str(user_a.id)


@pytest.mark.asyncio
async def test_capture_list_excludes_other_users(client_a, client_b, user_b, db_session_factory):
    await _seed_capture(db_session_factory, user_b.id, text="B secret capture")
    resp = await client_a.get("/api/captures")
    assert resp.status_code == 200
    texts = [c["raw_text"] for c in resp.json()]
    assert "B secret capture" not in texts


# ── integrations (C1) ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_integrations_list_does_not_leak_other_users_connection(client_a, user_b, db_session_factory):
    await _seed_integration(db_session_factory, user_b.id, provider="gcal")
    resp = await client_a.get("/api/integrations")
    assert resp.status_code == 200
    gcal = next(i for i in resp.json() if i["provider"] == "gcal")
    assert gcal["status"] == "disconnected"  # A must NOT see B's connection


@pytest.mark.asyncio
async def test_integration_status_is_per_user(client_a, user_b, db_session_factory):
    await _seed_integration(db_session_factory, user_b.id, provider="gcal")
    resp = await client_a.get("/api/integrations/gcal/status")
    assert resp.status_code == 200
    assert resp.json()["status"] == "disconnected"


# ── agents ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agents_list_excludes_other_users(client_a, user_b, db_session_factory):
    await _seed_agent(db_session_factory, user_b.id)
    resp = await client_a.get("/api/agents")
    assert resp.status_code == 200
    assert resp.json() == []  # A has no agents; must not see B's


@pytest.mark.asyncio
async def test_agent_get_other_users_agent_is_404(client_a, user_b, db_session_factory):
    await _seed_agent(db_session_factory, user_b.id, task_id="aios-morning-brief")
    resp = await client_a.get("/api/agents/aios-morning-brief")
    assert resp.status_code == 404


# ── auth boundary ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_unauthenticated_requests_are_rejected(client):
    # Fresh client with no cookie (clear any from prior login)
    client.cookies.clear()
    for path in ("/api/chat/sessions", "/api/captures", "/api/integrations", "/api/agents"):
        resp = await client.get(path)
        assert resp.status_code == 401, f"{path} should require auth"
