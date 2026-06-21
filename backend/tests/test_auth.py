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
