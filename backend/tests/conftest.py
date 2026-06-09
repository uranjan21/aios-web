"""Shared test fixtures."""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

# Point at a test DB (in-memory SQLite for unit tests; set DATABASE_URL env for integration)
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-minimum-32-chars!!")
os.environ.setdefault("APP_PASSWORD", "testpass")
os.environ.setdefault("LLM_PROVIDER", "nvidia")
os.environ.setdefault("NVIDIA_API_KEY", "nvapi-placeholder")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-placeholder")
os.environ.setdefault("ALLOWED_ORIGIN", "http://localhost:5173")
os.environ.setdefault("VAULT_PATH", "/tmp/vault-test")
os.environ.setdefault("TOKEN_ENCRYPTION_KEY", "dGVzdC1rZXktZm9yLWNpLW9ubHktZG8tbm90LXVzZQ==")


@pytest_asyncio.fixture(scope="session")
async def app():
    from app.main import create_app
    return create_app()


@pytest_asyncio.fixture(scope="session")
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client):
    """Client with a valid auth cookie."""
    resp = await client.post("/api/auth/login", json={"password": "testpass"})
    assert resp.status_code == 200
    return client
