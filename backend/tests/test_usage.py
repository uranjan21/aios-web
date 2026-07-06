"""Metered AI usage (Phase 2) tests. Cover recording, monthly aggregation, the
free-cap / owner-overage quota, and the Stripe-reporting drain (offline)."""
from types import SimpleNamespace

import pytest


@pytest.fixture
def billing_on(monkeypatch):
    from app.core.config import get_settings
    s = get_settings()
    monkeypatch.setattr(s, "stripe_secret_key", "sk_test_usage")
    monkeypatch.setattr(s, "stripe_price_pro", "price_usage")
    return s


def _principal(user, is_admin=False):
    return SimpleNamespace(id=user.id, is_admin=is_admin)


@pytest.mark.asyncio
async def test_record_and_sum_usage(user_a, db_session_factory):
    from app.services.billing.usage import record_ai_usage, usage_this_month
    async with db_session_factory() as db:
        await record_ai_usage(db, user_a.id, 1, "chat")
        await record_ai_usage(db, user_a.id, 2, "agents")
    async with db_session_factory() as db:
        assert await usage_this_month(db, user_a.id) == 3


@pytest.mark.asyncio
async def test_usage_endpoint_reports_overage(client_a, user_a, db_session_factory, billing_on, monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setattr(get_settings(), "ai_free_monthly_credits", 5)
    from app.services.billing.usage import record_ai_usage
    async with db_session_factory() as db:
        for _ in range(7):
            await record_ai_usage(db, user_a.id, 1, "chat")
    resp = await client_a.get("/api/billing/usage")
    assert resp.status_code == 200
    d = resp.json()
    assert (d["used"], d["included"], d["overage"]) == (7, 5, 2)


@pytest.mark.asyncio
async def test_quota_hard_caps_non_owner(user_a, db_session_factory, billing_on, monkeypatch):
    from app.core.config import get_settings
    from app.services.billing.usage import ai_allowed, record_ai_usage
    monkeypatch.setattr(get_settings(), "ai_free_monthly_credits", 2)
    async with db_session_factory() as db:
        assert await ai_allowed(db, _principal(user_a)) is True  # under cap
        await record_ai_usage(db, user_a.id, 2, "chat")
    async with db_session_factory() as db:
        assert await ai_allowed(db, _principal(user_a)) is False  # at cap, no metered module


@pytest.mark.asyncio
async def test_quota_overage_for_metered_owner(user_a, db_session_factory, billing_on, monkeypatch):
    from app.core.config import get_settings
    from app.models.billing import Subscription
    from app.services.billing.usage import ai_allowed, record_ai_usage
    monkeypatch.setattr(get_settings(), "ai_free_monthly_credits", 1)
    async with db_session_factory() as db:
        db.add(Subscription(user_id=user_a.id, plan="free", status="active", modules=["chat"]))
        await record_ai_usage(db, user_a.id, 9, "chat")
        await db.commit()
    async with db_session_factory() as db:
        assert await ai_allowed(db, _principal(user_a)) is True  # owner → overage allowed


@pytest.mark.asyncio
async def test_quota_unlimited_when_billing_off(user_a, db_session_factory):
    from app.services.billing.usage import ai_allowed, record_ai_usage
    async with db_session_factory() as db:
        await record_ai_usage(db, user_a.id, 9999, "chat")
    async with db_session_factory() as db:
        assert await ai_allowed(db, _principal(user_a)) is True


@pytest.mark.asyncio
async def test_report_drains_records_without_stripe(user_a, db_session_factory):
    """No `ai_usage` price → records are flagged reported (drained), never lost."""
    from sqlmodel import select
    from app.models.billing import AIUsageRecord
    from app.services.billing.usage import record_ai_usage, report_usage_to_stripe
    # The drain is global; clear any backlog from earlier tests first so the count
    # below is deterministic.
    async with db_session_factory() as db:
        await report_usage_to_stripe(db)
    async with db_session_factory() as db:
        await record_ai_usage(db, user_a.id, 1, "chat")
        await record_ai_usage(db, user_a.id, 1, "agents")
    async with db_session_factory() as db:
        assert await report_usage_to_stripe(db) == 2
    async with db_session_factory() as db:
        rows = (await db.execute(select(AIUsageRecord).where(AIUsageRecord.user_id == user_a.id))).scalars().all()
        assert rows and all(r.reported_to_stripe for r in rows)


@pytest.mark.asyncio
async def test_public_free_launch_hard_caps_ai(user_b, db_session_factory, monkeypatch):
    """Ship-critical: production + billing OFF must HARD-CAP AI per user so a
    public signup can't run up unbounded LLM spend on our provider key.
    (Dev/self-host stays unlimited — covered by test_quota_unlimited_when_billing_off.)"""
    from app.core.config import get_settings
    from app.services.billing.usage import ai_allowed, record_ai_usage
    s = get_settings()
    monkeypatch.setattr(s, "environment", "production")
    monkeypatch.setattr(s, "ai_free_monthly_credits", 5)
    # Under the cap → allowed
    async with db_session_factory() as db:
        assert await ai_allowed(db, _principal(user_b)) is True
    # At/over the cap with billing off → blocked (no paid overage path)
    async with db_session_factory() as db:
        await record_ai_usage(db, user_b.id, 5, "chat")
    async with db_session_factory() as db:
        assert await ai_allowed(db, _principal(user_b)) is False
    # Admins are never capped
    async with db_session_factory() as db:
        assert await ai_allowed(db, _principal(user_b, is_admin=True)) is True
