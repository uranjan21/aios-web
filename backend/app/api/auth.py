import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from urllib.parse import urlencode

import re

import httpx
from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlmodel import select

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(value: str) -> str:
    email = value.strip().lower()
    if not _EMAIL_RE.match(email):
        raise ValueError("Invalid email address")
    return email

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password, encrypt_token
from app.models.user import User
from app.models.oauth_state import OAuthState
from app.services.integrations.google_oauth import (
    GOOGLE_AUTH_URL,
    GOOGLE_TOKEN_URL,
    GOOGLE_USERINFO_URL,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Helpers ─────────────────────────────────────────────────────────────

_COOKIE_DAYS = 7

def _issue_cookie(response: Response, user_id: str, token_version: int = 1):
    settings = get_settings()
    token = create_access_token(
        {"sub": user_id, "ver": token_version},
        expires_delta=timedelta(days=_COOKIE_DAYS),
    )
    response.set_cookie(
        key="aios_token",
        value=token,
        httponly=True,
        samesite="strict",
        secure=settings.environment == "production",
        max_age=_COOKIE_DAYS * 24 * 3600,
    )


def _user_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
        "auth_provider": user.auth_provider,
        "is_admin": bool(user.is_admin),
        "email_verified": bool(user.email_verified),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "llm_provider": user.llm_provider,
        "openai_chat_model": user.openai_chat_model,
        "claude_model": user.claude_model,
        "has_openai_key": bool(user.openai_api_key_encrypted),
        "has_anthropic_key": bool(user.anthropic_api_key_encrypted),
    }


# ── Email / password login ──────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, response: Response, db=Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.strip().lower()))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        # Fallback: legacy env-var credentials — DEV ONLY. Never honored in production
        # so a forgotten APP_EMAIL/APP_PASSWORD can't become a live admin backdoor.
        settings = get_settings()
        if (
            settings.environment != "production"
            and secrets.compare_digest(body.email, settings.app_email)
            and secrets.compare_digest(body.password, settings.app_password)
        ):
            user = await _get_or_create_legacy_user(db, settings)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok", "user": _user_dict(user)}


async def _get_or_create_legacy_user(db, settings) -> User:
    """Find or create a user row for the legacy env-var credentials."""
    result = await db.execute(select(User).where(User.email == settings.app_email))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(
        email=settings.app_email,
        name="Admin",
        auth_provider="email",
        password_hash=hash_password(settings.app_password),
        is_admin=True,
        email_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ── Email / password signup ─────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    name: str
    password: str

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return _validate_email(v)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        name = v.strip()
        if not name:
            raise ValueError("Name is required")
        return name

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


@router.post("/signup")
@limiter.limit("5/minute")
async def signup(
    request: Request,
    body: SignupRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
):
    email = body.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    verification_token = secrets.token_urlsafe(32)
    user = User(
        email=email,
        name=body.name.strip(),
        auth_provider="email",
        password_hash=hash_password(body.password),
        email_verified=False,
        email_verification_token=_hash_verification_token(verification_token),
        email_verification_sent_at=datetime.utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _seed_new_user(user.id)
    # After the response — a slow mail provider must not delay signup.
    background_tasks.add_task(_send_verification, email, verification_token)

    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok", "user": _user_dict(user)}


def _hash_verification_token(token: str) -> str:
    """Only the sha256 of the emailed token is persisted, so a DB read can't mint valid links."""
    return hashlib.sha256(token.encode()).hexdigest()


async def _send_verification(email: str, token: str) -> None:
    from app.services.email import send_verification_email
    settings = get_settings()
    try:
        await send_verification_email(
            to=email,
            token=token,
            origin=settings.allowed_origin,
            from_addr=settings.email_from,
            api_key=settings.resend_api_key,
        )
    except Exception:
        import logging
        logging.getLogger(__name__).warning("Failed to send verification email to %s", email, exc_info=True)


async def _seed_new_user(user_id) -> None:
    """Provision a new user (default agents + free subscription). Non-fatal on failure."""
    try:
        from app.api.agents import seed_default_agents_for_user
        await seed_default_agents_for_user(user_id)
    except Exception:  # pragma: no cover - provisioning must never block signup
        import logging
        logging.getLogger(__name__).warning("Default agent seeding failed for %s", user_id, exc_info=True)
    try:
        from app.db.session import AsyncSessionLocal
        from app.services.billing.service import get_or_create_subscription
        async with AsyncSessionLocal() as session:
            await get_or_create_subscription(session, user_id)
    except Exception:  # pragma: no cover
        import logging
        logging.getLogger(__name__).warning("Free subscription seeding failed for %s", user_id, exc_info=True)


# ── Logout ──────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(
    response: Response,
    aios_token: str | None = Cookie(default=None),
    db=Depends(get_db),
):
    response.delete_cookie("aios_token")
    # Increment token_version to revoke all outstanding JWTs for this user (H4).
    if aios_token:
        payload = decode_access_token(aios_token)
        if payload and payload.get("sub"):
            try:
                uid = uuid.UUID(payload["sub"])
                result = await db.execute(select(User).where(User.id == uid))
                user = result.scalar_one_or_none()
                if user:
                    user.token_version += 1
                    user.updated_at = datetime.utcnow()
                    db.add(user)
                    await db.commit()
            except Exception:
                pass  # Never block logout due to revocation errors
    return {"status": "ok"}


# ── Current user ────────────────────────────────────────────────────────

@router.get("/me")
@limiter.limit("30/minute")
async def me(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return _user_dict(user)


# ── Profile update ──────────────────────────────────────────────────────

_URL_RE = re.compile(r"^https?://[^\s]{1,2048}$")


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    picture_url: str | None = None
    llm_provider: str | None = None
    openai_chat_model: str | None = None
    claude_model: str | None = None
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    @field_validator("picture_url")
    @classmethod
    def _picture_url(cls, v: str | None) -> str | None:
        if v is not None and v and not _URL_RE.match(v):
            raise ValueError("picture_url must be a valid http/https URL")
        return v

    @field_validator("llm_provider")
    @classmethod
    def _llm_provider(cls, v: str | None) -> str | None:
        if v is not None and v not in ("openai", "anthropic", "system"):
            raise ValueError("llm_provider must be 'openai', 'anthropic', or 'system'")
        return v

    @field_validator("openai_chat_model", "claude_model")
    @classmethod
    def _model_allowlist(cls, v: str | None) -> str | None:
        if v is None:
            return v
        from app.core.llm_models import allowed_models
        all_models = [m for models in allowed_models().values() for m in models]
        if v not in all_models:
            raise ValueError(f"Model '{v}' is not in the operator allowlist")
        return v


@router.patch("/profile")
@limiter.limit("10/minute")
async def update_profile(request: Request, body: ProfileUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        user.name = name
    if body.picture_url is not None:
        user.picture_url = body.picture_url
    if body.llm_provider is not None:
        user.llm_provider = body.llm_provider if body.llm_provider != "system" else None
    if body.openai_chat_model is not None:
        user.openai_chat_model = body.openai_chat_model
    if body.claude_model is not None:
        user.claude_model = body.claude_model
    if body.openai_api_key is not None:
        key = body.openai_api_key.strip()
        user.openai_api_key_encrypted = encrypt_token(key) if key else None
    if body.anthropic_api_key is not None:
        key = body.anthropic_api_key.strip()
        user.anthropic_api_key_encrypted = encrypt_token(key) if key else None
        
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_dict(user)


# ── Password change ────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current: str
    new: str

    @field_validator("new")
    @classmethod
    def _new(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    response: Response,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.password_hash or not verify_password(body.current, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(body.new)
    user.token_version += 1  # revoke all other active sessions (H4)
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()
    await db.refresh(user)
    # Re-issue cookie with the new token_version so the current session stays valid.
    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok"}


# ── Account deletion (GDPR right to erasure) ───────────────────────

@router.delete("/me")
@limiter.limit("2/minute")
async def delete_account(
    request: Request,
    response: Response,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Permanently delete the authenticated user's account and all their data.

    Table set is derived from the live ORM metadata (every table carrying a
    ``user_id`` column) rather than a hand-maintained list, so it can't silently
    rot when new user-data tables are added. Deletions run in reverse FK order.
    Any failure rolls the whole thing back and surfaces as a 500 — we never
    report success while leaving data behind (GDPR right to erasure).
    """
    from sqlalchemy import text
    from sqlmodel import SQLModel
    import app.models  # noqa: F401 — ensure every model is registered in metadata

    user_id = str(current_user.id)

    # Only touch tables that actually exist in this database (migrations may lag).
    existing = {
        row[0]
        for row in (
            await db.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
            )
        ).all()
    }

    # reversed(sorted_tables) gives children before parents → safe for FK constraints.
    for table in reversed(SQLModel.metadata.sorted_tables):
        if table.name == "users":
            continue
        if "user_id" not in table.columns:
            continue
        if table.name not in existing:
            continue
        await db.execute(
            text(f'DELETE FROM "{table.name}" WHERE user_id = :uid'), {"uid": user_id}
        )

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if user:
        await db.delete(user)
    await db.commit()

    response.delete_cookie("aios_token")
    return {"status": "deleted"}


# ── Google OAuth login ──────────────────────────────────────────────────

@router.get("/google/url")
async def google_login_url(db=Depends(get_db)):
    settings = get_settings()
    client_id = settings.gcal_client_id
    if not client_id:
        raise HTTPException(status_code=400, detail="Google OAuth not configured")

    state = secrets.token_urlsafe(32)
    redirect_uri = f"{settings.allowed_origin}/auth/google/callback"

    # Store state in DB so it survives multi-worker / pod-restart scenarios (H3).
    db.add(OAuthState(state=state, provider="auth", created_at=datetime.utcnow()))
    await db.commit()

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": state,
    }
    return {"url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


class GoogleCallbackBody(BaseModel):
    code: str
    state: str


@router.post("/google/callback")
@limiter.limit("10/minute")
async def google_login_callback(
    request: Request, body: GoogleCallbackBody, response: Response, db=Depends(get_db)
):
    # Validate and consume the state token from DB (H3).
    result = await db.execute(select(OAuthState).where(OAuthState.state == body.state))
    entry = result.scalar_one_or_none()
    if not entry or entry.provider != "auth":
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    age = datetime.utcnow() - entry.created_at
    await db.delete(entry)
    await db.commit()
    if age > timedelta(minutes=10):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    settings = get_settings()
    redirect_uri = f"{settings.allowed_origin}/auth/google/callback"

    async with httpx.AsyncClient(timeout=30) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": body.code,
                "client_id": settings.gcal_client_id,
                "client_secret": settings.gcal_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Google authentication failed")
        tokens = token_resp.json()

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to get Google profile")
        guser = userinfo_resp.json()

    google_email = (guser.get("email") or "").strip().lower()
    if not google_email:
        raise HTTPException(status_code=401, detail="Google account has no email")

    # Find or create user
    result = await db.execute(select(User).where(User.email == google_email))
    user = result.scalar_one_or_none()

    now = datetime.utcnow()
    if not user:
        user = User(
            email=google_email,
            name=guser.get("name", google_email.split("@")[0]),
            picture_url=guser.get("picture"),
            auth_provider="google",
            email_verified=True,  # Google verifies emails
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        await _seed_new_user(user.id)
    else:
        if guser.get("picture") and user.picture_url != guser["picture"]:
            user.picture_url = guser["picture"]
        if guser.get("name") and not user.name:
            user.name = guser["name"]
        if user.auth_provider == "email":
            user.auth_provider = "google"
        user.updated_at = now
        db.add(user)
        await db.commit()
        await db.refresh(user)

    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok", "user": _user_dict(user)}


# ── Email verification ──────────────────────────────────────────────────

_VERIFICATION_TOKEN_TTL = timedelta(hours=24)


@router.get("/verify-email")
async def verify_email(token: str, db=Depends(get_db)):
    """Consume a verification token and mark the user's email as verified.

    Deliberately does NOT issue an auth cookie: mail scanners prefetch links, and
    a leaked/forwarded link must not grant a session. The user's existing signup
    session keeps working; otherwise they log in normally.
    """
    if not token:
        raise HTTPException(status_code=400, detail="Missing verification token")

    hashed = _hash_verification_token(token)
    result = await db.execute(select(User).where(User.email_verification_token == hashed))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if user.email_verification_sent_at and datetime.utcnow() - user.email_verification_sent_at > _VERIFICATION_TOKEN_TTL:
        raise HTTPException(status_code=400, detail="Verification link has expired — request a new one")

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()

    return {"status": "ok"}


@router.post("/refresh")
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    response: Response,
    aios_token: str | None = Cookie(default=None),
    db=Depends(get_db),
):
    """Re-issue a fresh 7-day cookie for a valid (even near-expiry) token.

    The frontend 401 interceptor calls this before logging the user out so
    active sessions silently extend without forcing a re-login.
    """
    if not aios_token:
        raise HTTPException(status_code=401, detail="No token")

    payload = decode_access_token(aios_token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        uid = uuid.UUID(payload["sub"])
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Revoked token check: token_version mismatch means the user logged out or
    # changed their password — refuse the refresh.
    if payload.get("ver", 1) != user.token_version:
        raise HTTPException(status_code=401, detail="Session has been revoked")

    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok"}


@router.post("/resend-verification")
@limiter.limit("3/hour")
async def resend_verification(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Re-send the verification email for the authenticated user."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.email_verified:
        return {"status": "already_verified"}

    token = secrets.token_urlsafe(32)
    user.email_verification_token = _hash_verification_token(token)
    user.email_verification_sent_at = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()

    await _send_verification(user.email, token)
    return {"status": "sent"}
