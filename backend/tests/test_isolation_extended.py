"""Multi-tenant isolation tests for the 7 newer routers not covered by test_isolation.py.

Routers covered: goals, forecasts, actions, insights, automations, workspace
(projects / sprints / tasks).

User A must never read, modify, or delete user B's data.
"""
import pytest
from datetime import date


# ── helpers ─────────────────────────────────────────────────────────────────

async def _seed_goal(factory, user_id, title="B secret goal"):
    from app.models.goal import MacroGoal
    async with factory() as s:
        row = MacroGoal(user_id=user_id, title=title, category="finance", priority="medium")
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


async def _seed_forecast(factory, user_id, domain="finance"):
    from app.models.forecast import Forecast
    async with factory() as s:
        row = Forecast(
            user_id=user_id,
            domain=domain,
            metric="end_of_month_balance",
            target_date=date(2026, 12, 31),
            predicted_value=50000.0,
            confidence=0.8,
        )
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


async def _seed_insight(factory, user_id, title="B secret insight"):
    from app.models.insights import Insight
    async with factory() as s:
        row = Insight(
            user_id=user_id,
            kind="correlation",
            title=title,
            body="insight body text",
            metric_a="spend",
            metric_b="steps",
            r=0.7,
            n=30,
            lag=0,
            score=0.9,
            status="new",
        )
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


async def _seed_project(factory, user_id, name="B secret project"):
    from app.models.workspace import Project
    async with factory() as s:
        row = Project(user_id=user_id, name=name, domain="finance")
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


async def _seed_task(factory, user_id, project_id, title="B secret task"):
    from app.models.workspace import Task
    async with factory() as s:
        row = Task(user_id=user_id, project_id=project_id, title=title, domain="finance")
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row.id


# ── goals ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_goals_list_excludes_other_users(client_a, user_b, db_session_factory):
    await _seed_goal(db_session_factory, user_b.id)
    resp = await client_a.get("/api/goals")
    assert resp.status_code == 200
    titles = [g["title"] for g in resp.json()]
    assert "B secret goal" not in titles


@pytest.mark.asyncio
async def test_goal_patch_other_users_goal_is_404(client_a, user_b, db_session_factory):
    gid = await _seed_goal(db_session_factory, user_b.id)
    resp = await client_a.patch(f"/api/goals/{gid}", json={"title": "hacked"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_goal_delete_other_users_goal_is_404_and_preserved(client_a, user_b, db_session_factory):
    gid = await _seed_goal(db_session_factory, user_b.id)
    resp = await client_a.delete(f"/api/goals/{gid}")
    assert resp.status_code == 404
    # B's goal must still exist
    from app.models.goal import MacroGoal
    from sqlmodel import select
    async with db_session_factory() as s:
        still = (await s.execute(select(MacroGoal).where(MacroGoal.id == gid))).scalar_one_or_none()
    assert still is not None


# ── forecasts ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_forecasts_list_excludes_other_users(client_a, user_b, db_session_factory):
    await _seed_forecast(db_session_factory, user_b.id)
    resp = await client_a.get("/api/forecasts")
    assert resp.status_code == 200
    # A has no forecasts; B's forecast must not appear
    assert resp.json() == []


# ── actions ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_discoveries_excludes_other_users(client_a, user_b, db_session_factory):
    await _seed_insight(db_session_factory, user_b.id)
    resp = await client_a.get("/api/insights/discoveries")
    assert resp.status_code == 200
    # A has no insights of their own; B's must not bleed through
    assert resp.json() == []


@pytest.mark.asyncio
async def test_insight_feedback_other_users_insight_is_404(client_a, user_b, db_session_factory):
    iid = await _seed_insight(db_session_factory, user_b.id)
    resp = await client_a.post(f"/api/insights/discoveries/{iid}", json={"feedback": 1})
    assert resp.status_code == 404


# ── automations ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_automations_list_excludes_other_users_rules(client_a, client_b):
    # B enables a rule; A's list must remain empty
    r = await client_b.put(
        "/api/automations/bill_reminder_3d",
        json={"enabled": True, "params": {}},
    )
    assert r.status_code == 200
    resp = await client_a.get("/api/automations/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_unknown_automation_template_is_422(client_a):
    resp = await client_a.put(
        "/api/automations/nonexistent_template",
        json={"enabled": True, "params": {}},
    )
    assert resp.status_code == 422


# ── workspace — projects ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_projects_list_excludes_other_users(client_a, user_b, db_session_factory):
    await _seed_project(db_session_factory, user_b.id)
    resp = await client_a.get("/api/workspace/projects")
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert "B secret project" not in names


@pytest.mark.asyncio
async def test_project_patch_other_users_project_is_404(client_a, user_b, db_session_factory):
    pid = await _seed_project(db_session_factory, user_b.id)
    resp = await client_a.patch(f"/api/workspace/projects/{pid}", json={"name": "hacked"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_project_delete_other_users_project_is_404(client_a, user_b, db_session_factory):
    pid = await _seed_project(db_session_factory, user_b.id)
    resp = await client_a.delete(f"/api/workspace/projects/{pid}")
    assert resp.status_code == 404


# ── workspace — tasks ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_tasks_list_excludes_other_users(client_a, user_b, db_session_factory):
    pid = await _seed_project(db_session_factory, user_b.id)
    await _seed_task(db_session_factory, user_b.id, pid)
    resp = await client_a.get("/api/workspace/tasks")
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert "B secret task" not in titles


@pytest.mark.asyncio
async def test_task_patch_other_users_task_is_404(client_a, user_b, db_session_factory):
    pid = await _seed_project(db_session_factory, user_b.id)
    tid = await _seed_task(db_session_factory, user_b.id, pid)
    resp = await client_a.patch(f"/api/workspace/tasks/{tid}", json={"title": "hacked"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_task_delete_other_users_task_is_404(client_a, user_b, db_session_factory):
    pid = await _seed_project(db_session_factory, user_b.id)
    tid = await _seed_task(db_session_factory, user_b.id, pid)
    resp = await client_a.delete(f"/api/workspace/tasks/{tid}")
    assert resp.status_code == 404


