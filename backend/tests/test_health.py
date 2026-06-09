"""Tests for the /health endpoint."""
import pytest


@pytest.mark.asyncio
async def test_health_returns_200(client):
    resp = await client.get("/health")
    # Always 200 or 503 — should not 500
    assert resp.status_code in (200, 503)
    data = resp.json()
    assert "status" in data
    assert "service" in data
    assert data["service"] == "aios-web"


@pytest.mark.asyncio
async def test_health_shape(client):
    resp = await client.get("/health")
    data = resp.json()
    assert set(data.keys()) >= {"status", "service", "db", "watcher"}
