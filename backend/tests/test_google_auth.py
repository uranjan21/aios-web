"""Google OAuth login/signup flow (POST /api/auth/google/callback)."""
import uuid
from datetime import datetime, timedelta

import pytest
from sqlmodel import select

from app.models.oauth_state import OAuthState
from app.models.user import User


class _FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


def _mock_google(monkeypatch, userinfo, token_status=200, userinfo_status=200):
    """Replace httpx.AsyncClient in the auth module with a canned Google."""

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, url, **kwargs):
            return _FakeResponse(token_status, {"access_token": "fake-access-token"})

        async def get(self, url, **kwargs):
            return _FakeResponse(userinfo_status, userinfo)

    import app.api.auth as auth_mod
    monkeypatch.setattr(auth_mod.httpx, "AsyncClient", FakeClient)


async def _seed_state(db_session_factory, created_at=None) -> str:
    state = f"test-state-{uuid.uuid4().hex}"
    async with db_session_factory() as s:
        s.add(OAuthState(state=state, provider="auth", created_at=created_at or datetime.utcnow()))
        await s.commit()
    return state


@pytest.mark.asyncio
async def test_google_callback_creates_user_and_logs_in(client, db_session_factory, monkeypatch):
    email = f"g-{uuid.uuid4().hex[:8]}@gmail.com"
    _mock_google(monkeypatch, {
        "email": email, "verified_email": True,
        "name": "Google Person", "picture": "https://lh3.example.com/p.jpg",
    })
    state = await _seed_state(db_session_factory)

    resp = await client.post("/api/auth/google/callback", json={"code": "c", "state": state})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["name"] == "Google Person"
    assert body["user"]["email_verified"] is True
    assert "aios_token" in resp.headers.get("set-cookie", "")

    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.email == email))).scalar_one()
    assert user.auth_provider == "google"
    assert user.email_verified is True


@pytest.mark.asyncio
async def test_google_callback_rejects_unverified_google_email(client, db_session_factory, monkeypatch):
    """An address Google itself hasn't verified must not create or link an
    account — otherwise registering a victim's address at Google takes over
    their account here."""
    email = f"unv-{uuid.uuid4().hex[:8]}@gmail.com"
    _mock_google(monkeypatch, {"email": email, "verified_email": False, "name": "X"})
    state = await _seed_state(db_session_factory)

    resp = await client.post("/api/auth/google/callback", json={"code": "c", "state": state})
    assert resp.status_code == 401
    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.email == email))).scalar_one_or_none()
    assert user is None


@pytest.mark.asyncio
async def test_google_callback_state_is_single_use(client, db_session_factory, monkeypatch):
    email = f"once-{uuid.uuid4().hex[:8]}@gmail.com"
    _mock_google(monkeypatch, {"email": email, "verified_email": True, "name": "Once"})
    state = await _seed_state(db_session_factory)

    r1 = await client.post("/api/auth/google/callback", json={"code": "c", "state": state})
    assert r1.status_code == 200
    r2 = await client.post("/api/auth/google/callback", json={"code": "c", "state": state})
    assert r2.status_code == 400


@pytest.mark.asyncio
async def test_google_callback_expired_state_is_400(client, db_session_factory, monkeypatch):
    email = f"exp-{uuid.uuid4().hex[:8]}@gmail.com"
    _mock_google(monkeypatch, {"email": email, "verified_email": True, "name": "Late"})
    state = await _seed_state(db_session_factory, created_at=datetime.utcnow() - timedelta(minutes=11))

    resp = await client.post("/api/auth/google/callback", json={"code": "c", "state": state})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_google_callback_promotes_unverified_email_signup(client, db_session_factory, monkeypatch):
    """A pending email/password signup who signs in with Google (same address)
    is now verified — Google proved the mailbox, so they must not stay stuck
    behind require_verified."""
    from app.core.security import hash_password
    email = f"link-{uuid.uuid4().hex[:8]}@gmail.com"
    async with db_session_factory() as s:
        s.add(User(
            email=email, name="Pending", auth_provider="email",
            password_hash=hash_password("supersecret"),
            email_verified=False, email_verification_token="deadbeef",
            email_verification_sent_at=datetime.utcnow(),
        ))
        await s.commit()

    _mock_google(monkeypatch, {"email": email, "verified_email": True, "name": "Pending"})
    state = await _seed_state(db_session_factory)
    resp = await client.post("/api/auth/google/callback", json={"code": "c", "state": state})
    assert resp.status_code == 200

    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.email == email))).scalar_one()
    assert user.email_verified is True
    assert user.email_verification_token is None
    assert user.auth_provider == "google"


@pytest.mark.asyncio
async def test_google_callback_missing_name_falls_back_to_local_part(client, db_session_factory, monkeypatch):
    """Google can send name as null/empty — the account must not end up nameless."""
    local = f"noname{uuid.uuid4().hex[:8]}"
    email = f"{local}@gmail.com"
    _mock_google(monkeypatch, {"email": email, "verified_email": True, "name": None})
    state = await _seed_state(db_session_factory)

    resp = await client.post("/api/auth/google/callback", json={"code": "c", "state": state})
    assert resp.status_code == 200
    assert resp.json()["user"]["name"] == local


@pytest.mark.asyncio
async def test_google_callback_failed_token_exchange_is_401(client, db_session_factory, monkeypatch):
    _mock_google(monkeypatch, {}, token_status=400)
    state = await _seed_state(db_session_factory)
    resp = await client.post("/api/auth/google/callback", json={"code": "bad", "state": state})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_integration_save_tokens_writes_naive_datetimes(db_session_factory, monkeypatch):
    """integration_credentials timestamps are TIMESTAMP WITHOUT TIME ZONE —
    a tz-aware write crashes asyncpg with DataError (500 on the OAuth callback).
    Pin that save_tokens produces naive UTC values."""
    import app.services.integrations.google_oauth as go
    from app.core.security import hash_password
    # The CI Fernet key is a placeholder — encryption isn't what's under test.
    monkeypatch.setattr(go, "encrypt_token", lambda t: f"enc:{t}")
    save_tokens = go.save_tokens

    async with db_session_factory() as s:
        user = User(email=f"tz-{uuid.uuid4().hex[:8]}@test.dev", name="TZ", auth_provider="email",
                    password_hash=hash_password("supersecret"), email_verified=True)
        s.add(user)
        await s.commit()
        await s.refresh(user)

        cred = await save_tokens(user.id, s, "gmail", {
            "access_token": "at", "refresh_token": "rt", "expires_in": 3600,
            "email": "inbox@gmail.com", "name": "Inbox",
        })
        assert cred.token_expires_at.tzinfo is None
        assert cred.created_at.tzinfo is None
        assert cred.updated_at.tzinfo is None
        assert cred.account_email == "inbox@gmail.com"
        assert cred.status == "connected"
