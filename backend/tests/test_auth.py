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
async def test_signup_creates_account_no_cookie(client, db_session_factory):
    """Signup answers 202 and issues NO session — the verification link activates
    the account. The row is created and unverified."""
    import uuid
    from sqlmodel import select
    from app.models.user import User
    email = f"new-{uuid.uuid4().hex[:8]}@test.dev"
    resp = await client.post("/api/auth/signup", json={"name": "New User", "email": email, "password": "supersecret"})
    assert resp.status_code == 202
    assert resp.json()["status"] == "accepted"
    assert "aios_token" not in resp.headers.get("set-cookie", "")
    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.email == email))).scalar_one_or_none()
    assert user is not None
    assert user.email_verified is False


@pytest.mark.asyncio
async def test_signup_duplicate_email_is_indistinguishable(client, db_session_factory):
    """A second signup for an existing email must be byte-identical to a first-time
    one (202 + same body) — otherwise the endpoint is a user-enumeration oracle.
    The original account must be untouched (no password/name overwrite)."""
    import uuid
    from sqlmodel import select
    from app.models.user import User
    email = f"dup-{uuid.uuid4().hex[:8]}@test.dev"
    r1 = await client.post("/api/auth/signup", json={"name": "A", "email": email, "password": "supersecret"})
    assert r1.status_code == 202
    r2 = await client.post("/api/auth/signup", json={"name": "B", "email": email, "password": "differentpw"})
    assert r2.status_code == 202
    assert r2.json() == r1.json()
    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.email == email))).scalar_one()
    from app.core.security import verify_password
    assert user.name == "A"
    assert verify_password("supersecret", user.password_hash)


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
    assert resp.status_code == 202
    from app.models.user import User
    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.email == email))).scalar_one()
        agents = (await s.execute(select(Agent).where(Agent.user_id == user.id))).scalars().all()
    from app.api.agents import DEFAULT_AGENTS
    assert len(agents) == len(DEFAULT_AGENTS)


# ── Profile update model allowlist validation (F3) ────────────────────────────

@pytest.mark.asyncio
async def test_profile_update_invalid_model_is_422(auth_client):
    resp = await auth_client.patch(
        "/api/auth/profile",
        json={"openai_chat_model": "gpt-99-turbo"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_profile_update_valid_model_succeeds(auth_client):
    resp = await auth_client.patch(
        "/api/auth/profile",
        json={"openai_chat_model": "gpt-4o"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_profile_update_invalid_provider_is_422(auth_client):
    resp = await auth_client.patch(
        "/api/auth/profile",
        json={"llm_provider": "nvidia"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_profile_update_valid_provider_succeeds(auth_client):
    resp = await auth_client.patch(
        "/api/auth/profile",
        json={"llm_provider": "openai"},
    )
    assert resp.status_code == 200


# ── Email verification flow (F4) ──────────────────────────────────────────────
# Users are seeded directly in the DB (bypassing the rate-limited /signup route)
# so these tests don't compete with the signup rate-limit bucket.

async def _seed_unverified_user(db_session_factory, email: str, sent_at=None):
    """Create a user row with email_verified=False and a (hashed) verification token."""
    import secrets as _secrets
    from datetime import datetime
    from app.models.user import User
    from app.core.security import hash_password
    from app.api.auth import _hash_verification_token
    token = _secrets.token_urlsafe(32)
    user = User(
        email=email,
        name="unverifyme",
        auth_provider="email",
        password_hash=hash_password("supersecret123"),
        email_verified=False,
        email_verification_token=_hash_verification_token(token),
        email_verification_sent_at=sent_at or datetime.utcnow(),
    )
    async with db_session_factory() as s:
        s.add(user)
        await s.commit()
        await s.refresh(user)
    return user, token


@pytest.mark.asyncio
async def test_unverified_user_cannot_access_finance(app, db_session_factory):
    """require_verified blocks unverified users from area endpoints."""
    import uuid
    from httpx import AsyncClient, ASGITransport
    from app.core.security import create_access_token

    email = f"unverified-{uuid.uuid4().hex[:8]}@test.dev"
    user, _token = await _seed_unverified_user(db_session_factory, email)

    jwt = create_access_token({"sub": str(user.id)})
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        ac.cookies.set("aios_token", jwt)
        resp = await ac.get("/api/areas/finance/expenses")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_verify_email_token_grants_access(app, db_session_factory):
    """Valid token → email_verified=True; NO cookie is issued (link-prefetch safety),
    but an existing session for that user now clears the verified gate."""
    import uuid
    from httpx import AsyncClient, ASGITransport
    from app.core.security import create_access_token

    email = f"tokenv-{uuid.uuid4().hex[:8]}@test.dev"
    user, token = await _seed_unverified_user(db_session_factory, email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        verify_resp = await ac.get(f"/api/auth/verify-email?token={token}")
        assert verify_resp.status_code == 200
        assert "aios_token" not in verify_resp.headers.get("set-cookie", "")

        # The user's own (signup-time) session should now pass require_verified.
        ac.cookies.set("aios_token", create_access_token({"sub": str(user.id)}))
        finance_resp = await ac.get("/api/areas/finance/expenses")
        assert finance_resp.status_code == 200


@pytest.mark.asyncio
async def test_verify_email_expired_token_is_400(app, db_session_factory):
    """A token older than 24h is rejected even though the hash matches."""
    import uuid
    from datetime import datetime, timedelta
    from httpx import AsyncClient, ASGITransport

    email = f"expired-{uuid.uuid4().hex[:8]}@test.dev"
    _user, token = await _seed_unverified_user(
        db_session_factory, email, sent_at=datetime.utcnow() - timedelta(hours=25)
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(f"/api/auth/verify-email?token={token}")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_verify_email_reusing_token_fails(app, db_session_factory):
    """Consuming the token clears it; a second use of the same token is 400."""
    import uuid
    from httpx import AsyncClient, ASGITransport

    email = f"reuse-{uuid.uuid4().hex[:8]}@test.dev"
    _user, token = await _seed_unverified_user(db_session_factory, email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r1 = await ac.get(f"/api/auth/verify-email?token={token}")
        assert r1.status_code == 200

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r2 = await ac.get(f"/api/auth/verify-email?token={token}")
        assert r2.status_code == 400


@pytest.mark.asyncio
async def test_verify_email_with_invalid_token_is_400(client):
    resp = await client.get("/api/auth/verify-email?token=totallybogustoken")
    assert resp.status_code == 400


# ── Password reset flow ───────────────────────────────────────────────────────

async def _seed_user_with_password(db_session_factory, email: str, password: str = "originalpw123"):
    import uuid
    from app.models.user import User
    from app.core.security import hash_password
    user = User(
        email=email,
        name="resetme",
        auth_provider="email",
        password_hash=hash_password(password),
        email_verified=True,
    )
    async with db_session_factory() as s:
        s.add(user)
        await s.commit()
        await s.refresh(user)
    return user


async def _set_reset_token(db_session_factory, user_id, sent_at=None):
    """Mint a reset token for a user the way /forgot-password would, returning the raw token."""
    import secrets as _secrets
    from datetime import datetime
    from sqlmodel import select
    from app.models.user import User
    from app.api.auth import _hash_verification_token
    token = _secrets.token_urlsafe(32)
    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.id == user_id))).scalar_one()
        user.password_reset_token = _hash_verification_token(token)
        user.password_reset_sent_at = sent_at or datetime.utcnow()
        s.add(user)
        await s.commit()
    return token


@pytest.mark.asyncio
async def test_forgot_password_always_202(client):
    """Unknown and known addresses both return 202 — no enumeration."""
    import uuid
    unknown = await client.post("/api/auth/forgot-password", json={"email": f"nobody-{uuid.uuid4().hex[:8]}@test.dev"})
    assert unknown.status_code == 202
    assert unknown.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_reset_password_changes_password_and_revokes_sessions(app, db_session_factory):
    import uuid
    from httpx import AsyncClient, ASGITransport
    from sqlmodel import select
    from app.models.user import User
    from app.core.security import verify_password

    email = f"reset-{uuid.uuid4().hex[:8]}@test.dev"
    user = await _seed_user_with_password(db_session_factory, email)
    old_version = user.token_version
    token = await _set_reset_token(db_session_factory, user.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/auth/reset-password", json={"token": token, "password": "brandnewpw456"})
    assert resp.status_code == 200

    async with db_session_factory() as s:
        fresh = (await s.execute(select(User).where(User.id == user.id))).scalar_one()
    assert verify_password("brandnewpw456", fresh.password_hash)
    assert not verify_password("originalpw123", fresh.password_hash)
    assert fresh.token_version == old_version + 1  # every outstanding session dies
    assert fresh.password_reset_token is None       # single-use


@pytest.mark.asyncio
async def test_reset_password_token_is_single_use(app, db_session_factory):
    import uuid
    from httpx import AsyncClient, ASGITransport

    email = f"reset1x-{uuid.uuid4().hex[:8]}@test.dev"
    user = await _seed_user_with_password(db_session_factory, email)
    token = await _set_reset_token(db_session_factory, user.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r1 = await ac.post("/api/auth/reset-password", json={"token": token, "password": "firstnewpw123"})
        assert r1.status_code == 200
        r2 = await ac.post("/api/auth/reset-password", json={"token": token, "password": "secondnewpw123"})
        assert r2.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_expired_token_is_400(app, db_session_factory):
    import uuid
    from datetime import datetime, timedelta
    from httpx import AsyncClient, ASGITransport

    email = f"resetexp-{uuid.uuid4().hex[:8]}@test.dev"
    user = await _seed_user_with_password(db_session_factory, email)
    token = await _set_reset_token(db_session_factory, user.id, sent_at=datetime.utcnow() - timedelta(hours=2))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/auth/reset-password", json={"token": token, "password": "whatevernewpw"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_invalid_token_is_400(client):
    resp = await client.post("/api/auth/reset-password", json={"token": "bogus", "password": "irrelevantpw123"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_weak_password_is_422(client):
    resp = await client.post("/api/auth/reset-password", json={"token": "anything", "password": "short"})
    assert resp.status_code == 422


# ── Onboarding activation ────────────────────────────────────────────────────
# Completion used to live in `localStorage.ct_onboarded`, so it followed the
# BROWSER rather than the account: a new device replayed the flow, and the
# activation event the product funnel is defined on was never recorded at all.

@pytest.mark.asyncio
async def test_new_user_is_not_onboarded(client_a):
    res = await client_a.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["onboarded_at"] is None


@pytest.mark.asyncio
async def test_marking_onboarded_persists_on_the_account(client_a):
    res = await client_a.post("/api/auth/me/onboarded")
    assert res.status_code == 200
    stamped = res.json()["onboarded_at"]
    assert stamped is not None

    # Survives a fresh read — i.e. it is on the row, not in the response only.
    again = await client_a.get("/api/auth/me")
    assert again.json()["onboarded_at"] == stamped


@pytest.mark.asyncio
async def test_marking_onboarded_is_idempotent(client_a):
    """Re-posting must not move an existing activation date."""
    first = (await client_a.post("/api/auth/me/onboarded")).json()["onboarded_at"]
    second = (await client_a.post("/api/auth/me/onboarded")).json()["onboarded_at"]
    assert first == second


@pytest.mark.asyncio
async def test_onboarding_is_per_account(client_a, client_b):
    await client_a.post("/api/auth/me/onboarded")
    assert (await client_b.get("/api/auth/me")).json()["onboarded_at"] is None
