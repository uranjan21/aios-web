"""
`GET /api/goals` carries the latest recorded progress score.

Progress rows were write-only until 2026-08-02 — the Weekly Review posted one
every week and nothing read it back. The area Overview pages now draw domain
goal progress from it, so the list has to expose it, has to expose the LATEST
one, and must not leak another user's rows into the figure.
"""
import pytest


async def _create_goal(client, title: str, category: str = "finance") -> str:
    resp = await client.post("/api/goals", json={"title": title, "category": category})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_list_goals_reports_no_score_before_any_progress(client_a):
    await _create_goal(client_a, "Unscored goal")
    resp = await client_a.get("/api/goals")
    assert resp.status_code == 200
    goal = next(g for g in resp.json() if g["title"] == "Unscored goal")
    # None, not 0 — "never scored" and "scored zero" are different answers, and
    # the frontend falls back to milestone completion only for the former.
    assert goal["progress_score"] is None


@pytest.mark.asyncio
async def test_list_goals_reports_the_latest_progress_score(client_a):
    gid = await _create_goal(client_a, "Scored goal")
    for score in (20, 55, 80):
        resp = await client_a.post(f"/api/goals/{gid}/progress", json={"progress_score": score})
        assert resp.status_code == 201, resp.text

    resp = await client_a.get("/api/goals")
    goal = next(g for g in resp.json() if g["id"] == gid)
    assert goal["progress_score"] == 80


@pytest.mark.asyncio
async def test_progress_scores_are_scoped_per_goal(client_a):
    a = await _create_goal(client_a, "Goal A", category="health")
    b = await _create_goal(client_a, "Goal B", category="health")
    await client_a.post(f"/api/goals/{a}/progress", json={"progress_score": 40})

    rows = {g["id"]: g["progress_score"] for g in (await client_a.get("/api/goals")).json()}
    assert rows[a] == 40
    assert rows[b] is None
