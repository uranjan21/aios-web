"""Admin endpoint authorization and audit-log correctness tests.

Verifies:
- Non-admin callers receive 403 on every admin-only endpoint.
- Admin callers get 200 and the AdminAuditLog row records the correct admin_id.
- toggle_admin on self returns 400.
"""
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from tests.conftest import TestSessionLocal, _client_for


# ── fixtures ─────────────────────────────────────────────────────────────────

async def _make_admin(email: str):
    from app.models.user import User
    from app.core.security import hash_password
    user = User(
        email=email,
        name="admin",
        auth_provider="email",
        password_hash=hash_password("adminpass123"),
        is_admin=True,
    )
    async with TestSessionLocal() as s:
        s.add(user)
        await s.commit()
        await s.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(app):
    return await _make_admin(f"admin-{uuid.uuid4().hex[:8]}@test.dev")


@pytest_asyncio.fixture
async def admin_client(app, admin_user):
    async with _client_for(app, admin_user) as ac:
        yield ac


# ── non-admin gets 403 ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_non_admin_cannot_list_users(client_a):
    resp = await client_a.get("/api/admin/users")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_admin_cannot_override_plan(client_a, user_a):
    resp = await client_a.patch(
        f"/api/admin/users/{user_a.id}/plan",
        json={"plan": "pro", "status": "active"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_admin_cannot_toggle_admin(client_a, user_b):
    resp = await client_a.patch(
        f"/api/admin/users/{user_b.id}/admin",
        json={"is_admin": True},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_admin_cannot_delete_user(client_a, user_b):
    resp = await client_a.delete(f"/api/admin/users/{user_b.id}")
    assert resp.status_code == 403


# ── admin succeeds + audit log correctness ────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_can_override_plan_and_audit_log_has_correct_admin_id(
    admin_client, admin_user, user_b, db_session_factory
):
    resp = await admin_client.patch(
        f"/api/admin/users/{user_b.id}/plan",
        json={"plan": "pro", "status": "active"},
    )
    assert resp.status_code == 200

    # Verify audit log recorded the right admin
    from app.models.admin_audit import AdminAuditLog
    from sqlmodel import select
    async with db_session_factory() as s:
        result = await s.execute(
            select(AdminAuditLog)
            .where(AdminAuditLog.action == "override_plan")
            .where(AdminAuditLog.target_user_id == user_b.id)
            .order_by(AdminAuditLog.created_at.desc())
        )
        log = result.scalars().first()
    assert log is not None
    assert log.admin_id == admin_user.id


@pytest.mark.asyncio
async def test_admin_can_list_users(admin_client):
    resp = await admin_client.get("/api/admin/users")
    assert resp.status_code == 200
    body = resp.json()
    assert "users" in body
    assert "total" in body


# ── self-admin toggle is 400 ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_toggle_admin_on_self_is_400(admin_client, admin_user):
    resp = await admin_client.patch(
        f"/api/admin/users/{admin_user.id}/admin",
        json={"is_admin": False},
    )
    assert resp.status_code == 400


# ── invalid plan name is 400 ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_override_plan_with_invalid_plan_is_400(admin_client, user_b):
    resp = await admin_client.patch(
        f"/api/admin/users/{user_b.id}/plan",
        json={"plan": "enterprise", "status": "active"},
    )
    assert resp.status_code == 400
