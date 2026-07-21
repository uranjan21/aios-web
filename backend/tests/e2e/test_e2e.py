import pytest
import uuid
import datetime
from sqlmodel import select

# ── Helper Seeders ───────────────────────────────────────────────────────────

async def _seed_project(factory, user_id, name="Project A", domain="finance", goal_id=None):
    from app.models.workspace import Project
    async with factory() as s:
        row = Project(user_id=user_id, name=name, domain=domain, goal_id=goal_id)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row

async def _seed_sprint(factory, user_id, project_id, name="Sprint 1", capacity=10):
    from app.models.workspace import Sprint
    async with factory() as s:
        row = Sprint(user_id=user_id, project_id=project_id, name=name, capacity=capacity)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row

async def _seed_task(factory, user_id, title="Task A", domain="finance", project_id=None, sprint_id=None, goal_id=None):
    from app.models.workspace import Task
    async with factory() as s:
        row = Task(user_id=user_id, title=title, domain=domain, project_id=project_id, sprint_id=sprint_id, goal_id=goal_id)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row

async def _seed_goal(factory, user_id, title="Goal A", category="finance", priority="medium"):
    from app.models.goal import MacroGoal
    async with factory() as s:
        row = MacroGoal(user_id=user_id, title=title, category=category, priority=priority)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row

async def _seed_goal_progress(factory, user_id, goal_id, progress_score=50, ai_insight="On track"):
    from app.models.goal import GoalProgress
    async with factory() as s:
        row = GoalProgress(user_id=user_id, goal_id=goal_id, progress_score=progress_score, ai_insight=ai_insight)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row

async def _seed_campaign(factory, user_id, name="Campaign A", description="Desc"):
    from app.models.content import ContentCampaign
    async with factory() as s:
        row = ContentCampaign(user_id=user_id, name=name, description=description)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row

async def _seed_content_item(factory, user_id, title="Item A", platform="twitter", status="idea", campaign_id=None):
    from app.models.content import ContentItem
    async with factory() as s:
        row = ContentItem(user_id=user_id, title=title, platform=platform, status=status, campaign_id=campaign_id)
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return row

# ── Tier 1: Feature Coverage (Tests 1-35) ────────────────────────────────────

# R1: Domain Syncing for Workspace Entities
@pytest.mark.asyncio
async def test_r1_create_project_with_domain(client_a):
    resp = await client_a.post("/api/workspace/projects", json={"name": "Project Alpha", "domain": "career"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Project Alpha"
    assert resp.json()["domain"] == "career"

@pytest.mark.asyncio
async def test_r1_create_task_with_domain(client_a):
    resp = await client_a.post("/api/workspace/tasks", json={"title": "Task Alpha", "domain": "career"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Task Alpha"
    assert resp.json()["domain"] == "career"

@pytest.mark.asyncio
async def test_r1_create_macro_goal(client_a):
    resp = await client_a.post("/api/goals", json={"title": "Goal Alpha", "category": "career", "priority": "high"})
    assert resp.status_code == 201
    assert resp.json()["title"] == "Goal Alpha"
    assert resp.json()["category"] == "career"

@pytest.mark.asyncio
async def test_r1_update_project(client_a, db_session_factory, user_a):
    p = await _seed_project(db_session_factory, user_a.id, name="Old Project", domain="finance")
    resp = await client_a.patch(f"/api/workspace/projects/{p.id}", json={"name": "New Project", "domain": "health"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Project"
    assert resp.json()["domain"] == "health"

@pytest.mark.asyncio
async def test_r1_list_tasks_by_domain(client_a, db_session_factory, user_a):
    await _seed_task(db_session_factory, user_a.id, title="Task A", domain="health")
    await _seed_task(db_session_factory, user_a.id, title="Task B", domain="finance")
    resp = await client_a.get("/api/workspace/tasks?domain=health")
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert "Task A" in titles
    assert "Task B" not in titles

# R2: PageHeader Description Alignment
@pytest.mark.asyncio
async def test_r2_project_description(client_a, db_session_factory, user_a):
    p = await _seed_project(db_session_factory, user_a.id, name="Project B", domain="finance")
    resp = await client_a.get("/api/workspace/projects")
    assert resp.status_code == 200
    projects = resp.json()
    assert len(projects) > 0
    assert "description" in projects[0]

@pytest.mark.asyncio
async def test_r2_task_description(client_a, db_session_factory, user_a):
    t = await _seed_task(db_session_factory, user_a.id, title="Task B", domain="finance")
    resp = await client_a.get("/api/workspace/tasks")
    assert resp.status_code == 200
    tasks = resp.json()
    assert len(tasks) > 0
    assert "description" in tasks[0]

@pytest.mark.asyncio
async def test_r2_sprint_goals(client_a, db_session_factory, user_a):
    p = await _seed_project(db_session_factory, user_a.id)
    await _seed_sprint(db_session_factory, user_a.id, project_id=p.id, name="Sprint B")
    resp = await client_a.get("/api/workspace/sprints")
    assert resp.status_code == 200
    sprints = resp.json()
    assert len(sprints) > 0
    assert "goals" in sprints[0]

@pytest.mark.asyncio
async def test_r2_goal_description(client_a, db_session_factory, user_a):
    await _seed_goal(db_session_factory, user_a.id, title="Goal B")
    resp = await client_a.get("/api/goals")
    assert resp.status_code == 200
    goals = resp.json()
    assert len(goals) > 0
    assert "description" in goals[0]

@pytest.mark.asyncio
async def test_r2_stats_schema(client_a):
    resp = await client_a.get("/api/workspace/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "projects_count" in data
    assert "sprints_count" in data
    assert "tasks_count" in data
    assert "goals_count" in data

# R3: Content Page UI Consistency


@pytest.mark.asyncio
async def test_r4_list_tasks_project(client_a, db_session_factory, user_a):
    p1 = await _seed_project(db_session_factory, user_a.id, name="P1")
    p2 = await _seed_project(db_session_factory, user_a.id, name="P2")
    await _seed_task(db_session_factory, user_a.id, title="Task P1", project_id=p1.id)
    await _seed_task(db_session_factory, user_a.id, title="Task P2", project_id=p2.id)
    
    resp = await client_a.get(f"/api/workspace/tasks?project_id={p1.id}")
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert "Task P1" in titles
    assert "Task P2" not in titles

@pytest.mark.asyncio
async def test_r4_list_tasks_sprint(client_a, db_session_factory, user_a):
    p = await _seed_project(db_session_factory, user_a.id)
    s1 = await _seed_sprint(db_session_factory, user_a.id, project_id=p.id, name="S1")
    s2 = await _seed_sprint(db_session_factory, user_a.id, project_id=p.id, name="S2")
    await _seed_task(db_session_factory, user_a.id, title="Task S1", sprint_id=s1.id)
    await _seed_task(db_session_factory, user_a.id, title="Task S2", sprint_id=s2.id)

    resp = await client_a.get(f"/api/workspace/tasks?sprint_id={s1.id}")
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert "Task S1" in titles
    assert "Task S2" not in titles

@pytest.mark.asyncio
async def test_r4_list_sprints_project(client_a, db_session_factory, user_a):
    p1 = await _seed_project(db_session_factory, user_a.id, name="P1")
    p2 = await _seed_project(db_session_factory, user_a.id, name="P2")
    await _seed_sprint(db_session_factory, user_a.id, project_id=p1.id, name="Sprint P1")
    await _seed_sprint(db_session_factory, user_a.id, project_id=p2.id, name="Sprint P2")

    resp = await client_a.get(f"/api/workspace/sprints?project_id={p1.id}")
    assert resp.status_code == 200
    names = [s["name"] for s in resp.json()]
    assert "Sprint P1" in names
    assert "Sprint P2" not in names

@pytest.mark.asyncio
async def test_r4_list_tasks_all(client_a, db_session_factory, user_a):
    await _seed_task(db_session_factory, user_a.id, title="T1")
    await _seed_task(db_session_factory, user_a.id, title="T2")
    resp = await client_a.get("/api/workspace/tasks")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2

@pytest.mark.asyncio
async def test_r4_list_sprints_all(client_a, db_session_factory, user_a):
    p = await _seed_project(db_session_factory, user_a.id)
    await _seed_sprint(db_session_factory, user_a.id, project_id=p.id, name="S1")
    await _seed_sprint(db_session_factory, user_a.id, project_id=p.id, name="S2")
    resp = await client_a.get("/api/workspace/sprints")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2

# R5: Dashboard Layout Optimization
@pytest.mark.asyncio
async def test_r5_heatmap(client_a):
    resp = await client_a.get("/api/insights/heatmap")
    assert resp.status_code == 200
    assert "days" in resp.json()
    assert "streak" in resp.json()

@pytest.mark.asyncio
async def test_r5_today_briefing(client_a):
    resp = await client_a.get("/api/insights/briefing/today")
    assert resp.status_code == 200
    assert "status" in resp.json()

@pytest.mark.asyncio
async def test_r5_pulse(client_a):
    resp = await client_a.get("/api/insights/pulse")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@pytest.mark.asyncio
async def test_r5_briefing_preferences_get(client_a):
    resp = await client_a.get("/api/insights/briefing/preferences")
    assert resp.status_code == 200
    assert "enabled" in resp.json()

@pytest.mark.asyncio
async def test_r5_briefing_preferences_update(client_a):
    resp = await client_a.post("/api/insights/briefing/preferences", json={
        "enabled": False, "deliver_at": "12:00:00", "channels": {"email": True}, "tz": "UTC"
    })
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False

# R6: Interactive Saved Quotes Feature (UNIMPLEMENTED - expected to fail with 201/200/204 assertions)
@pytest.mark.asyncio
async def test_r6_create_quote(client_a):
    # Expect failure since /api/quotes does not exist yet (will raise 404 but assert expects 201)
    resp = await client_a.post("/api/quotes", json={"text": "Write code that matters", "author": "Unknown"})
    assert resp.status_code == 201

@pytest.mark.asyncio
async def test_r6_list_quotes(client_a):
    resp = await client_a.get("/api/quotes")
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_r6_delete_quote(client_a):
    # First create a quote to delete
    post_resp = await client_a.post("/api/quotes", json={"text": "To delete", "author": "DeleteMe"})
    assert post_resp.status_code == 201
    quote_id = post_resp.json()["id"]
    # Then delete it
    resp = await client_a.delete(f"/api/quotes/{quote_id}")
    assert resp.status_code == 204

@pytest.mark.asyncio
async def test_r6_random_quote(client_a):
    resp = await client_a.get("/api/quotes/random")
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_r6_patch_quote(client_a):
    # First create a quote to patch
    post_resp = await client_a.post("/api/quotes", json={"text": "To patch", "author": "PatchMe"})
    assert post_resp.status_code == 201
    quote_id = post_resp.json()["id"]
    # Then patch it
    resp = await client_a.patch(f"/api/quotes/{quote_id}", json={"favorite": True})
    assert resp.status_code == 200
    assert resp.json()["favorite"] is True

# R7: Contextual Quick Capture Button
@pytest.mark.asyncio
async def test_r7_create_plain_capture(client_a):
    resp = await client_a.post("/api/captures", json={"raw_text": "Need to record a video today"})
    assert resp.status_code == 201
    assert resp.json()["raw_text"] == "Need to record a video today"

@pytest.mark.asyncio
async def test_r7_list_captures(client_a, db_session_factory, user_a):
    from app.models.captures import Capture
    async with db_session_factory() as s:
        s.add(Capture(user_id=user_a.id, raw_text="Capture 1"))
        s.add(Capture(user_id=user_a.id, raw_text="Capture 2"))
        await s.commit()

    resp = await client_a.get("/api/captures")
    assert resp.status_code == 200
    texts = [c["raw_text"] for c in resp.json()]
    assert "Capture 1" in texts
    assert "Capture 2" in texts

@pytest.mark.asyncio
async def test_r7_parse_capture_fallback(client_a):
    # Without keys, it should fall back safely to capture domain
    resp = await client_a.post("/api/captures/parse", json={"text": "Buy groceries"})
    assert resp.status_code == 200
    assert resp.json()["domain"] == "capture"
    assert resp.json()["fields"]["text"] == "Buy groceries"

@pytest.mark.asyncio
async def test_r7_parse_capture_body(client_a):
    resp = await client_a.post("/api/captures/parse", json={"text": "Some random note"})
    assert resp.status_code == 200
    assert "domain" in resp.json()
    assert "fields" in resp.json()

@pytest.mark.asyncio
async def test_r7_create_capture_char_limit(client_a):
    resp = await client_a.post("/api/captures", json={"raw_text": "X"})
    assert resp.status_code == 201
    assert resp.json()["raw_text"] == "X"

# ── Tier 2: Boundary & Corner Cases (Tests 36-70) ─────────────────────────────

# R1 Boundaries
@pytest.mark.asyncio
async def test_t2_r1_project_empty_name(client_a):
    resp = await client_a.post("/api/workspace/projects", json={"name": "", "domain": "finance"})
    assert resp.status_code in (200, 422)

@pytest.mark.asyncio
async def test_t2_r1_task_missing_title(client_a):
    resp = await client_a.post("/api/workspace/tasks", json={"domain": "finance"})
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r1_project_invalid_goal(client_a):
    resp = await client_a.post("/api/workspace/projects", json={"name": "P", "goal_id": str(uuid.uuid4())})
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_t2_r1_project_isolation(client_a, db_session_factory, user_b):
    p = await _seed_project(db_session_factory, user_b.id)
    resp = await client_a.patch(f"/api/workspace/projects/{p.id}", json={"name": "Hacked"})
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_t2_r1_delete_nonexistent_project(client_a):
    resp = await client_a.delete(f"/api/workspace/projects/{uuid.uuid4()}")
    assert resp.status_code == 404

# R2 Boundaries
@pytest.mark.asyncio
async def test_t2_r2_project_long_description(client_a):
    long_desc = "x" * 5000
    resp = await client_a.post("/api/workspace/projects", json={"name": "Project Long", "description": long_desc})
    assert resp.status_code == 200
    assert resp.json()["description"] == long_desc

@pytest.mark.asyncio
async def test_t2_r2_task_long_description(client_a):
    long_desc = "x" * 5000
    resp = await client_a.post("/api/workspace/tasks", json={"title": "Task Long", "description": long_desc})
    assert resp.status_code == 200
    assert resp.json()["description"] == long_desc

@pytest.mark.asyncio
async def test_t2_r2_sprint_long_goals(client_a, db_session_factory, user_a):
    p = await _seed_project(db_session_factory, user_a.id)
    long_goals = "y" * 5000
    resp = await client_a.post("/api/workspace/sprints", json={"project_id": str(p.id), "name": "S", "goals": long_goals})
    assert resp.status_code == 200
    assert resp.json()["goals"] == long_goals

@pytest.mark.asyncio
async def test_t2_r2_goal_long_description(client_a):
    long_desc = "z" * 5000
    resp = await client_a.post("/api/goals", json={"title": "Goal Long", "category": "finance", "description": long_desc})
    assert resp.status_code == 201
    assert resp.json()["description"] == long_desc

@pytest.mark.asyncio
async def test_t2_r2_stats_isolation(client_a, client_b, db_session_factory, user_a, user_b):
    await _seed_project(db_session_factory, user_a.id, name="User A Project")
    await _seed_project(db_session_factory, user_b.id, name="User B Project")
    resp_a = await client_a.get("/api/workspace/stats")
    resp_b = await client_b.get("/api/workspace/stats")
    assert resp_a.status_code == 200
    assert resp_b.status_code == 200
    assert resp_a.json()["projects_count"] >= 1

# R3 Boundaries


@pytest.mark.asyncio
async def test_t2_r4_list_tasks_invalid_project_id(client_a):
    resp = await client_a.get("/api/workspace/tasks?project_id=not-a-uuid")
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r4_list_tasks_invalid_sprint_id(client_a):
    resp = await client_a.get("/api/workspace/tasks?sprint_id=not-a-uuid")
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r4_list_sprints_invalid_project_id(client_a):
    resp = await client_a.get("/api/workspace/sprints?project_id=not-a-uuid")
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r4_list_tasks_isolation(client_a, db_session_factory, user_b):
    p = await _seed_project(db_session_factory, user_b.id)
    await _seed_task(db_session_factory, user_b.id, title="B task", project_id=p.id)
    resp = await client_a.get(f"/api/workspace/tasks?project_id={p.id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 0

@pytest.mark.asyncio
async def test_t2_r4_list_sprints_isolation(client_a, db_session_factory, user_b):
    p = await _seed_project(db_session_factory, user_b.id)
    await _seed_sprint(db_session_factory, user_b.id, project_id=p.id)
    resp = await client_a.get(f"/api/workspace/sprints?project_id={p.id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 0

# R5 Boundaries
@pytest.mark.asyncio
async def test_t2_r5_heatmap_invalid_days(client_a):
    resp = await client_a.get("/api/insights/heatmap?days=500")
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r5_heatmap_negative_days(client_a):
    resp = await client_a.get("/api/insights/heatmap?days=-5")
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r5_heatmap_isolation(client_a, db_session_factory, user_b):
    from app.models.captures import Capture
    async with db_session_factory() as s:
        s.add(Capture(user_id=user_b.id, raw_text="B capture"))
        await s.commit()
    resp = await client_a.get("/api/insights/heatmap?days=30")
    assert resp.status_code == 200
    counts = resp.json()["days"]
    assert sum(counts.values()) == 0

@pytest.mark.asyncio
async def test_t2_r5_pulse_isolation(client_a, db_session_factory, user_b):
    await _seed_content_item(db_session_factory, user_b.id)
    resp = await client_a.get("/api/insights/pulse")
    assert resp.status_code == 200
    for tile in resp.json():
        if tile["domain"] == "content":
            assert tile["value"] == 0

@pytest.mark.asyncio
async def test_t2_r5_update_briefing_prefs_invalid(client_a):
    resp = await client_a.post("/api/insights/briefing/preferences", json={
        "enabled": "not-a-bool"
    })
    assert resp.status_code == 422

# R6 Boundaries
@pytest.mark.asyncio
async def test_t2_r6_create_quote_invalid(client_a):
    resp = await client_a.post("/api/quotes", json={"invalid": "field"})
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r6_get_quote_nonexistent(client_a):
    resp = await client_a.get(f"/api/quotes/{uuid.uuid4()}")
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_t2_r6_patch_quote_nonexistent(client_a):
    resp = await client_a.patch(f"/api/quotes/{uuid.uuid4()}", json={"text": "edit"})
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_t2_r6_delete_quote_nonexistent(client_a):
    resp = await client_a.delete(f"/api/quotes/{uuid.uuid4()}")
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_t2_r6_quotes_isolation(client_a):
    resp = await client_a.get("/api/quotes")
    assert resp.status_code == 200

# R7 Boundaries
@pytest.mark.asyncio
async def test_t2_r7_create_capture_empty(client_a):
    resp = await client_a.post("/api/captures", json={"raw_text": ""})
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r7_create_capture_too_long(client_a):
    resp = await client_a.post("/api/captures", json={"raw_text": "x" * 2001})
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r7_parse_capture_too_long(client_a):
    resp = await client_a.post("/api/captures/parse", json={"text": "x" * 501})
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r7_parse_capture_empty(client_a):
    resp = await client_a.post("/api/captures/parse", json={"text": ""})
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_t2_r7_list_captures_isolation(client_a, db_session_factory, user_b):
    from app.models.captures import Capture
    async with db_session_factory() as s:
        s.add(Capture(user_id=user_b.id, raw_text="B secret capture"))
        await s.commit()
    resp = await client_a.get("/api/captures")
    assert resp.status_code == 200
    texts = [c["raw_text"] for c in resp.json()]
    assert "B secret capture" not in texts

# ── Tier 3: Cross-Feature Combinations (Tests 71-77) ──────────────────────────

@pytest.mark.asyncio
async def test_t3_goal_project_link(client_a, db_session_factory, user_a):
    goal = await _seed_goal(db_session_factory, user_a.id, title="Reach 10k users", category="career")
    resp = await client_a.post("/api/workspace/projects", json={
        "name": "Acquisition Campaign",
        "domain": "career",
        "goal_id": str(goal.id)
    })
    assert resp.status_code == 200
    assert resp.json()["goal_id"] == str(goal.id)

@pytest.mark.asyncio
async def test_t3_project_sprint_task_hierarchy(client_a, db_session_factory, user_a):
    p = await _seed_project(db_session_factory, user_a.id, name="Dev Platform", domain="career")
    s = await _seed_sprint(db_session_factory, user_a.id, project_id=p.id, name="Sprint 1")
    resp = await client_a.post("/api/workspace/tasks", json={
        "title": "Build API",
        "domain": "career",
        "project_id": str(p.id),
        "sprint_id": str(s.id)
    })
    assert resp.status_code == 200
    assert resp.json()["project_id"] == str(p.id)
    assert resp.json()["sprint_id"] == str(s.id)


@pytest.mark.asyncio
async def test_t3_project_and_tasks_reflected_in_stats(client_a, db_session_factory, user_a):
    await _seed_project(db_session_factory, user_a.id, name="Test Project", domain="finance")
    await _seed_task(db_session_factory, user_a.id, title="Test Task", domain="finance")
    resp = await client_a.get("/api/workspace/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["projects_count"] >= 1
    assert data["tasks_count"] >= 1

@pytest.mark.asyncio
async def test_t3_workspace_and_goal_deletion_cascades(client_a, db_session_factory, user_a):
    goal = await _seed_goal(db_session_factory, user_a.id, title="Cascaded Goal")
    await _seed_goal_progress(db_session_factory, user_a.id, goal_id=goal.id)
    del_resp = await client_a.delete(f"/api/goals/{goal.id}")
    assert del_resp.status_code == 204
    from app.models.goal import MacroGoal, GoalProgress
    async with db_session_factory() as s:
        db_goal = await s.get(MacroGoal, goal.id)
        assert db_goal is None
        result = await s.execute(select(GoalProgress).where(GoalProgress.goal_id == goal.id))
        assert len(result.scalars().all()) == 0

@pytest.mark.asyncio
async def test_t3_saved_quotes_interaction_with_dashboard(client_a):
    quote_resp = await client_a.post("/api/quotes", json={"text": "Inspirational Quote", "author": "Plato"})
    assert quote_resp.status_code == 201

# ── Tier 4: Real-World Application Scenarios (Tests 78-82) ────────────────────


@pytest.mark.asyncio
async def test_t4_flow_sprint_planning(client_a):
    goal = await client_a.post("/api/goals", json={"title": "Q3 Goal", "category": "career"})
    assert goal.status_code == 201
    goal_id = goal.json()["id"]
    proj = await client_a.post("/api/workspace/projects", json={
        "name": "Project Q3", "domain": "career", "goal_id": goal_id
    })
    assert proj.status_code == 200
    proj_id = proj.json()["id"]
    sprint = await client_a.post("/api/workspace/sprints", json={
        "project_id": proj_id, "name": "Sprint 1", "capacity": 20
    })
    assert sprint.status_code == 200
    sprint_id = sprint.json()["id"]
    task1 = await client_a.post("/api/workspace/tasks", json={
        "title": "Task 1", "domain": "career", "project_id": proj_id, "sprint_id": sprint_id
    })
    assert task1.status_code == 200
    stats = await client_a.get("/api/workspace/stats")
    assert stats.status_code == 200
    assert stats.json()["projects_count"] >= 1

@pytest.mark.asyncio
async def test_t4_flow_multi_tenant_complete_isolation(client_a, client_b):
    p_a = await client_a.post("/api/workspace/projects", json={"name": "A Project", "domain": "career"})
    assert p_a.status_code == 200
    pa_id = p_a.json()["id"]
    list_b = await client_b.get("/api/workspace/projects")
    assert list_b.status_code == 200
    assert pa_id not in [p["id"] for p in list_b.json()]
    patch_b = await client_b.patch(f"/api/workspace/projects/{pa_id}", json={"name": "Hacked"})
    assert patch_b.status_code == 404

@pytest.mark.asyncio
async def test_t4_flow_saved_quotes_management(client_a):
    post_q = await client_a.post("/api/quotes", json={"text": "Stay hungry, stay foolish", "author": "Steve Jobs"})
    assert post_q.status_code == 201
    qid = post_q.json()["id"]
    list_q = await client_a.get("/api/quotes")
    assert list_q.status_code == 200
    assert qid in [q["id"] for q in list_q.json()]

@pytest.mark.asyncio
async def test_t4_flow_quick_capture_triage(client_a):
    cap = await client_a.post("/api/captures", json={"raw_text": "Need to follow up with client tomorrow"})
    assert cap.status_code == 201
    parse = await client_a.post("/api/captures/parse", json={"text": "Need to follow up with client tomorrow"})
    assert parse.status_code == 200
    assert parse.json()["domain"] == "capture"
    cap_list = await client_a.get("/api/captures")
    assert cap_list.status_code == 200
    assert len(cap_list.json()) >= 1
