"""Billing (M1) tests. Billing is disabled in tests (no Stripe keys), so these
verify the safe defaults: free plan, entitlements inert, paid endpoints 404,
and per-user isolation of subscription state.
"""
import pytest


@pytest.mark.asyncio
async def test_subscription_defaults_to_free(client_a):
    resp = await client_a.get("/api/billing/subscription")
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan"] == "free"
    assert data["billing_enabled"] is False
    assert "features" in data


@pytest.mark.asyncio
async def test_checkout_disabled_without_stripe(client_a):
    resp = await client_a.post("/api/billing/checkout", json={"plan": "pro"})
    assert resp.status_code == 404  # billing not enabled


@pytest.mark.asyncio
async def test_webhook_disabled_without_stripe(client):
    client.cookies.clear()
    resp = await client.post("/api/billing/webhook", content=b"{}", headers={"stripe-signature": "x"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_entitlement_gate_is_noop_when_billing_disabled(client_a):
    # require_plan("pro") guards agent trigger; with billing off it must NOT 402.
    # (404 is fine — agent doesn't exist for this user — but never 402.)
    resp = await client_a.post("/api/agents/aios-morning-brief/trigger")
    assert resp.status_code != 402


@pytest.mark.asyncio
async def test_subscription_is_per_user(client_a, client_b, user_a, db_session_factory):
    # Give A a pro subscription directly; B must still read free.
    from app.models.billing import Subscription
    async with db_session_factory() as s:
        s.add(Subscription(user_id=user_a.id, plan="pro", status="active"))
        await s.commit()

    ra = await client_a.get("/api/billing/subscription")
    rb = await client_b.get("/api/billing/subscription")
    assert ra.json()["plan"] == "pro"
    assert rb.json()["plan"] == "free"
