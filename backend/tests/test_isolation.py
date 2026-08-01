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


# ── workspace milestones (added 2026-08-01 with the entity) ──────────────────

async def _seed_milestone(factory, user_id, title="B's private milestone"):
    from app.models.workspace import Milestone
    async with factory() as s:
        row = Milestone(user_id=user_id, title=title)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


@pytest.mark.asyncio
async def test_milestone_list_excludes_other_users(client_a, user_b, db_session_factory):
    await _seed_milestone(db_session_factory, user_b.id)
    resp = await client_a.get("/api/workspace/milestones")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_milestone_patch_other_users_is_404(client_a, user_b, db_session_factory):
    mid = await _seed_milestone(db_session_factory, user_b.id)
    resp = await client_a.patch(f"/api/workspace/milestones/{mid}", json={"title": "hijacked"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_milestone_delete_other_users_is_404(client_a, user_b, db_session_factory):
    mid = await _seed_milestone(db_session_factory, user_b.id)
    resp = await client_a.delete(f"/api/workspace/milestones/{mid}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_milestone_rejects_unknown_status(client_a):
    resp = await client_a.post(
        "/api/workspace/milestones", json={"title": "Ship v1", "status": "nonsense"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_milestone_cannot_attach_to_other_users_goal(client_a, user_b, db_session_factory):
    from app.models.goal import MacroGoal
    async with db_session_factory() as s:
        goal = MacroGoal(user_id=user_b.id, title="B's goal", category="finance")
        s.add(goal)
        await s.commit()
        await s.refresh(goal)
        goal_id = goal.id

    resp = await client_a.post(
        "/api/workspace/milestones",
        json={"title": "Ship v1", "goal_id": str(goal_id), "domain": "finance"},
    )
    assert resp.status_code == 404


# ── career journal (added 2026-08-01 with the entity) ────────────────────────

async def _seed_journal(factory, user_id, body="B's private reflection"):
    from datetime import date
    from app.models.career import CareerJournalEntry
    async with factory() as s:
        row = CareerJournalEntry(
            user_id=user_id, entry_date=date.today(), body=body, word_count=len(body.split())
        )
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


@pytest.mark.asyncio
async def test_journal_list_excludes_other_users(client_a, user_b, db_session_factory):
    await _seed_journal(db_session_factory, user_b.id)
    resp = await client_a.get("/api/areas/career/journal")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_journal_patch_other_users_is_404(client_a, user_b, db_session_factory):
    eid = await _seed_journal(db_session_factory, user_b.id)
    resp = await client_a.patch(f"/api/areas/career/journal/{eid}", json={"body": "hijacked"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_journal_delete_other_users_is_404(client_a, user_b, db_session_factory):
    eid = await _seed_journal(db_session_factory, user_b.id)
    resp = await client_a.delete(f"/api/areas/career/journal/{eid}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_journal_rejects_empty_body(client_a):
    resp = await client_a.post("/api/areas/career/journal", json={"body": "   "})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_journal_derives_tags_and_word_count(client_a):
    resp = await client_a.post(
        "/api/areas/career/journal",
        json={"body": "Shipped the release today and mentored a teammate through the review."},
    )
    assert resp.status_code == 200
    entry = resp.json()
    assert entry["word_count"] == 11
    tags = set(entry["tags"].split(","))
    # "Shipped"/"release" -> shipping, "mentored" -> leadership, "review" -> collaboration
    assert {"shipping", "leadership", "collaboration"} <= tags


@pytest.mark.asyncio
async def test_journal_stats_are_per_user(client_a, user_b, db_session_factory):
    await _seed_journal(db_session_factory, user_b.id, body="B wrote a lot of words here")
    resp = await client_a.get("/api/areas/career/journal/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_entries"] == 0
    assert body["words_this_month"] == 0


# ── plan blocks (added 2026-08-01 with the entity) ───────────────────────────

async def _seed_block(factory, user_id, title="B's private block", priority=False):
    from datetime import date, time
    from app.models.workspace import PlanBlock
    async with factory() as s:
        row = PlanBlock(
            user_id=user_id, block_date=date.today(),
            start_time=time(9, 0), end_time=time(10, 0),
            title=title, is_priority=priority,
        )
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


@pytest.mark.asyncio
async def test_plan_blocks_list_excludes_other_users(client_a, user_b, db_session_factory):
    await _seed_block(db_session_factory, user_b.id)
    resp = await client_a.get("/api/workspace/plan-blocks")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_plan_block_patch_other_users_is_404(client_a, user_b, db_session_factory):
    bid = await _seed_block(db_session_factory, user_b.id)
    resp = await client_a.patch(f"/api/workspace/plan-blocks/{bid}", json={"title": "hijacked"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_plan_block_rejects_end_before_start(client_a):
    from datetime import date
    resp = await client_a.post("/api/workspace/plan-blocks", json={
        "block_date": str(date.today()), "start_time": "10:00:00",
        "end_time": "09:00:00", "title": "Backwards",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_plan_block_priority_is_exclusive_per_day(client_a):
    from datetime import date
    day = str(date.today())
    first = await client_a.post("/api/workspace/plan-blocks", json={
        "block_date": day, "start_time": "09:00:00", "end_time": "10:00:00",
        "title": "First priority", "is_priority": True,
    })
    assert first.status_code == 200

    second = await client_a.post("/api/workspace/plan-blocks", json={
        "block_date": day, "start_time": "11:00:00", "end_time": "12:00:00",
        "title": "Second priority", "is_priority": True,
    })
    assert second.status_code == 200

    listing = await client_a.get("/api/workspace/plan-blocks")
    priorities = [b for b in listing.json() if b["is_priority"]]
    assert len(priorities) == 1
    assert priorities[0]["title"] == "Second priority"


# ── auth boundary ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_unauthenticated_requests_are_rejected(client):
    # Fresh client with no cookie (clear any from prior login)
    client.cookies.clear()
    for path in ("/api/chat/sessions", "/api/captures", "/api/integrations", "/api/agents"):
        resp = await client.get(path)
        assert resp.status_code == 401, f"{path} should require auth"
