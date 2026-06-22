"""Tests for auth endpoints."""
import pytest


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    resp = await client.post("/api/auth/login", json={"email": "test@example.com", "password": "wrongpassword"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_correct_password(client):
    resp = await client.post("/api/auth/login", json={"email": "admin@example.com", "password": "testpass"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"
    # Cookie must be set (httpOnly — appears in Set-Cookie header)
    assert "aios_token" in resp.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(auth_client):
    resp = await auth_client.get("/api/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert "username" in data or "id" in data


@pytest.mark.asyncio
async def test_logout(auth_client):
    resp = await auth_client.post("/api/auth/logout")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_login_missing_body(client):
    resp = await client.post("/api/auth/login", json={})
    assert resp.status_code == 422


# ── Signup (M3) ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_signup_creates_account_and_sets_cookie(client):
    import uuid
    email = f"new-{uuid.uuid4().hex[:8]}@test.dev"
    resp = await client.post("/api/auth/signup", json={"name": "New User", "email": email, "password": "supersecret"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["user"]["email"] == email
    assert "aios_token" in resp.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_signup_duplicate_email_rejected(client):
    import uuid
    email = f"dup-{uuid.uuid4().hex[:8]}@test.dev"
    r1 = await client.post("/api/auth/signup", json={"name": "A", "email": email, "password": "supersecret"})
    assert r1.status_code == 200
    client.cookies.clear()
    r2 = await client.post("/api/auth/signup", json={"name": "B", "email": email, "password": "supersecret"})
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_signup_weak_password_rejected(client):
    resp = await client.post("/api/auth/signup", json={"name": "X", "email": "weak@test.dev", "password": "short"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_signup_seeds_default_agents(client, db_session_factory):
    import uuid
    from sqlmodel import select
    from app.models.agent import Agent
    email = f"seed-{uuid.uuid4().hex[:8]}@test.dev"
    resp = await client.post("/api/auth/signup", json={"name": "Seed", "email": email, "password": "supersecret"})
    assert resp.status_code == 200
    uid = uuid.UUID(resp.json()["user"]["id"])
    async with db_session_factory() as s:
        agents = (await s.execute(select(Agent).where(Agent.user_id == uid))).scalars().all()
    assert len(agents) == 8
