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


def _stub_stripe(fail: bool):
    """Fake Stripe module: a subscription carrying the ai_usage item, and a usage
    record call that either succeeds or blows up. No network."""
    class _Sub:
        @staticmethod
        def retrieve(sub_id):
            return {"id": sub_id, "items": {"data": [{"id": "si_ai", "price": {"id": "price_ai"}}]}}

    class _Item:
        @staticmethod
        def create_usage_record(item_id, quantity, action):
            if fail:
                raise RuntimeError("stripe is down")
            return {"id": "mbur_1"}

    return SimpleNamespace(Subscription=_Sub, SubscriptionItem=_Item)


async def _seed_billable_usage(db_session_factory, user, units=3):
    from app.models.billing import Subscription
    from app.services.billing.usage import record_ai_usage
    async with db_session_factory() as db:
        db.add(Subscription(
            user_id=user.id, plan="pro", status="active", modules=["chat"],
            stripe_customer_id=f"cus_{user.id.hex[:8]}",
            stripe_subscription_id=f"sub_{user.id.hex[:8]}",
        ))
        await db.commit()
    async with db_session_factory() as db:
        await record_ai_usage(db, user.id, units, "chat")


@pytest.fixture
def metered_billing(monkeypatch):
    from app.core.config import get_settings
    s = get_settings()
    monkeypatch.setattr(s, "stripe_secret_key", "sk_test_metered")
    monkeypatch.setattr(s, "stripe_price_pro", "price_metered")
    monkeypatch.setattr(s, "stripe_module_prices", {"chat": "price_chat", "ai_usage": "price_ai"})
    return s


@pytest.mark.asyncio
async def test_stripe_failure_leaves_usage_unreported(user_a, db_session_factory, metered_billing, monkeypatch):
    """B5: a Stripe outage must NOT mark usage billed — that destroyed revenue with
    no retry. The row stays pending for the next run."""
    from sqlmodel import select
    from app.models.billing import AIUsageRecord
    from app.services.billing import service as billing_service
    from app.services.billing.usage import report_usage_to_stripe

    await _seed_billable_usage(db_session_factory, user_a, units=3)
    monkeypatch.setattr(billing_service, "_stripe", lambda: _stub_stripe(fail=True))

    async with db_session_factory() as db:
        assert await report_usage_to_stripe(db) == 0
    async with db_session_factory() as db:
        rows = (await db.execute(select(AIUsageRecord).where(AIUsageRecord.user_id == user_a.id))).scalars().all()
        assert rows and not any(r.reported_to_stripe for r in rows)


@pytest.mark.asyncio
async def test_successful_report_marks_usage_reported(user_b, db_session_factory, metered_billing, monkeypatch):
    """B5 (other direction): Stripe accepted it → the row is flipped, so the next
    run doesn't double-bill."""
    from sqlmodel import select
    from app.models.billing import AIUsageRecord
    from app.services.billing import service as billing_service
    from app.services.billing.usage import report_usage_to_stripe

    await _seed_billable_usage(db_session_factory, user_b, units=4)
    monkeypatch.setattr(billing_service, "_stripe", lambda: _stub_stripe(fail=False))

    # >= 4: the scan is global, so an earlier test's pending backlog may ride along.
    async with db_session_factory() as db:
        assert await report_usage_to_stripe(db) >= 4
    async with db_session_factory() as db:
        rows = (await db.execute(select(AIUsageRecord).where(AIUsageRecord.user_id == user_b.id))).scalars().all()
        assert rows and all(r.reported_to_stripe for r in rows)
    # Second run has nothing left to bill.
    async with db_session_factory() as db:
        assert await report_usage_to_stripe(db) == 0


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


# ── Chat credit pricing (R9) ─────────────────────────────────────────────────
# On 2026-08-17 chat metering changed from a flat 1 credit per response to one
# credit per 8k input tokens. That is a PRICING change — a user who sends long
# prompts is charged more than they were the day before — and it shipped with no
# test, flagged in docs/AUDIT_2026_08_16.md as needing sign-off before launch.
# These pin the behaviour so the rule cannot drift silently.

import pytest

from app.services.billing.usage import (
    INPUT_TOKENS_PER_CREDIT,
    credits_for_input_tokens,
)


@pytest.mark.parametrize("tokens", [0, 1, 500, 4_000, 7_999, 8_000])
def test_an_ordinary_turn_still_costs_exactly_one_credit(tokens):
    """The whole point of the floor: normal use is unchanged by the new model."""
    assert credits_for_input_tokens(tokens) == 1


def test_a_response_is_never_free():
    """Including when the provider reports no usage at all — a missing usage
    field must not silently hand out free inference."""
    assert credits_for_input_tokens(0) == 1
    assert credits_for_input_tokens(-1) == 1


@pytest.mark.parametrize(
    "tokens,expected",
    [
        (8_001, 2),      # one token over a boundary rounds UP, never down
        (16_000, 2),     # exactly two buckets is two, not three
        (16_001, 3),
        (80_000, 10),    # a deliberately huge prompt pays for what it consumes
        (200_000, 25),
    ],
)
def test_large_prompts_are_charged_proportionally(tokens, expected):
    assert credits_for_input_tokens(tokens) == expected


def test_charge_is_monotonic_in_input_size():
    """A bigger prompt must never cost less than a smaller one."""
    seen = [credits_for_input_tokens(n) for n in range(0, 40_000, 137)]
    assert seen == sorted(seen)


def test_bucket_size_is_the_documented_one():
    """Guards the constant itself: changing it changes every customer's bill."""
    assert INPUT_TOKENS_PER_CREDIT == 8_000
    assert credits_for_input_tokens(INPUT_TOKENS_PER_CREDIT) == 1
    assert credits_for_input_tokens(INPUT_TOKENS_PER_CREDIT + 1) == 2
