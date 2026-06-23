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


@pytest.fixture
def billing_on(monkeypatch):
    """Flip `settings.billing_enabled` True for the duration of a test by setting
    the Stripe fields on the cached settings singleton (auto-reverted)."""
    from app.core.config import get_settings
    s = get_settings()
    monkeypatch.setattr(s, "stripe_secret_key", "sk_test_phase0")
    monkeypatch.setattr(s, "stripe_price_pro", "price_phase0")
    assert s.billing_enabled is True
    return s


@pytest.mark.asyncio
async def test_require_module_blocks_unentitled_when_billing_on(client_a, billing_on):
    """Phase 0 security fix (HTTP): a free user (no sub) is entitled to finance/
    health/career only — the Business & Content routers must 402 *server-side*,
    closing the curl auth-bypass that frontend-only gating allowed. The 402 fires
    before the handler, so no domain tables are needed."""
    rb = await client_a.get("/api/areas/business/")
    assert rb.status_code == 402
    assert rb.json()["detail"]["module"] == "business"

    rc = await client_a.get("/api/areas/content/items")
    assert rc.status_code == 402
    assert rc.json()["detail"]["module"] == "content"


def _principal(user, is_admin=False):
    from types import SimpleNamespace
    return SimpleNamespace(id=user.id, is_admin=is_admin)


@pytest.mark.asyncio
async def test_entitled_modules_free_user(user_a, db_session_factory, billing_on):
    """Free user (no sub) owns exactly the three free-tier areas."""
    from app.core.entitlements import get_entitled_modules
    async with db_session_factory() as db:
        mods = await get_entitled_modules(db, _principal(user_a))
    assert mods == {"finance", "health", "career"}


@pytest.mark.asyncio
async def test_entitled_modules_with_addon(user_a, db_session_factory, billing_on):
    """Pro Plus + a Business add-on grants Business but not Content."""
    from app.models.billing import Subscription
    from app.core.entitlements import get_entitled_modules
    async with db_session_factory() as db:
        db.add(Subscription(user_id=user_a.id, plan="pro_plus", status="active", addons=["business"]))
        await db.commit()
    async with db_session_factory() as db:
        mods = await get_entitled_modules(db, _principal(user_a))
    assert "business" in mods
    assert "content" not in mods


@pytest.mark.asyncio
async def test_entitled_modules_admin_bypass(user_a, db_session_factory, billing_on):
    """Admins get every module even with billing on."""
    from app.core.entitlements import get_entitled_modules, ALL_MODULES
    async with db_session_factory() as db:
        mods = await get_entitled_modules(db, _principal(user_a, is_admin=True))
    assert mods == set(ALL_MODULES)


@pytest.mark.asyncio
async def test_entitled_modules_all_when_billing_off(user_a, db_session_factory):
    """Billing disabled (dev/self-host) → everything unlocked, unchanged behavior."""
    from app.core.entitlements import get_entitled_modules, ALL_MODULES
    async with db_session_factory() as db:
        mods = await get_entitled_modules(db, _principal(user_a))
    assert mods == set(ALL_MODULES)


# ── Phase 1: modular billing ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_catalog_lists_all_modules(client_a):
    resp = await client_a.get("/api/billing/catalog")
    assert resp.status_code == 200
    data = resp.json()
    keys = {m["key"] for m in data["modules"]}
    assert keys == {"finance", "health", "career", "business", "content", "chat", "agents", "integrations"}
    assert data["bundle_key"] == "everything"
    metered = {m["key"] for m in data["modules"] if m["metered"]}
    assert metered == {"chat", "agents"}


@pytest.mark.asyncio
async def test_set_modules_billing_off_persists(client_a):
    """Self-host / billing-off: setting modules applies immediately, no checkout."""
    resp = await client_a.post("/api/billing/modules", json={"modules": ["finance", "business"], "bundle": False})
    assert resp.status_code == 200
    assert resp.json()["checkout_url"] is None
    assert set(resp.json()["modules"]) == {"finance", "business"}

    sub = await client_a.get("/api/billing/subscription")
    assert set(sub.json()["modules"]) == {"finance", "business"}


@pytest.mark.asyncio
async def test_set_free_area(client_a):
    resp = await client_a.post("/api/billing/free-area", json={"area": "health"})
    assert resp.status_code == 200
    assert resp.json()["free_area"] == "health"
    # A non-area key is rejected.
    bad = await client_a.post("/api/billing/free-area", json={"area": "chat"})
    assert bad.status_code == 400


@pytest.mark.asyncio
async def test_entitled_reads_modules_column(user_a, db_session_factory, billing_on):
    """Source-of-truth flip: entitlement comes from `modules`, not `plan`."""
    from app.models.billing import Subscription
    from app.core.entitlements import get_entitled_modules
    async with db_session_factory() as db:
        db.add(Subscription(user_id=user_a.id, plan="free", status="active", modules=["finance", "content"]))
        await db.commit()
    async with db_session_factory() as db:
        mods = await get_entitled_modules(db, _principal(user_a))
    assert mods == {"finance", "content"}


@pytest.mark.asyncio
async def test_entitled_bundle_grants_all(user_a, db_session_factory, billing_on):
    from app.models.billing import Subscription
    from app.core.entitlements import get_entitled_modules, ALL_MODULES
    async with db_session_factory() as db:
        db.add(Subscription(user_id=user_a.id, plan="free", status="active", bundle=True, modules=[]))
        await db.commit()
    async with db_session_factory() as db:
        mods = await get_entitled_modules(db, _principal(user_a))
    assert mods == set(ALL_MODULES)


@pytest.mark.asyncio
async def test_webhook_rebuilds_modules_from_all_line_items(user_a, db_session_factory, monkeypatch):
    """The webhook must map EVERY line item → module (the old code read only the
    first), so multi-module subscriptions are represented faithfully."""
    from app.core.config import get_settings
    from app.models.billing import Subscription
    from app.services.billing import service as billing
    s = get_settings()
    monkeypatch.setattr(s, "stripe_module_prices", {
        "finance": "price_fin", "content": "price_con", "everything": "price_all",
    })
    async with db_session_factory() as db:
        db.add(Subscription(user_id=user_a.id, plan="free", status="active", stripe_customer_id="cus_phase1"))
        await db.commit()

    stripe_obj = {
        "customer": "cus_phase1", "id": "sub_phase1", "status": "active",
        "items": {"data": [{"price": {"id": "price_fin"}}, {"price": {"id": "price_con"}}]},
    }
    async with db_session_factory() as db:
        await billing._apply_subscription_object(db, stripe_obj)

    from sqlmodel import select
    async with db_session_factory() as db:
        sub = (await db.execute(select(Subscription).where(Subscription.user_id == user_a.id))).scalar_one()
        assert set(sub.modules) == {"finance", "content"}
        assert sub.bundle is False


@pytest.mark.asyncio
async def test_webhook_bundle_price_sets_bundle(user_a, db_session_factory, monkeypatch):
    from app.core.config import get_settings
    from app.models.billing import Subscription
    from app.services.billing import service as billing
    from app.core.entitlements import ALL_MODULES
    s = get_settings()
    monkeypatch.setattr(s, "stripe_module_prices", {"everything": "price_all"})
    async with db_session_factory() as db:
        db.add(Subscription(user_id=user_a.id, plan="free", status="active", stripe_customer_id="cus_bundle"))
        await db.commit()

    stripe_obj = {
        "customer": "cus_bundle", "id": "sub_bundle", "status": "active",
        "items": {"data": [{"price": {"id": "price_all"}}]},
    }
    async with db_session_factory() as db:
        await billing._apply_subscription_object(db, stripe_obj)

    from sqlmodel import select
    async with db_session_factory() as db:
        sub = (await db.execute(select(Subscription).where(Subscription.user_id == user_a.id))).scalar_one()
        assert sub.bundle is True
        assert set(sub.modules) == set(ALL_MODULES)


# ── Phase 3: polish (metered item, dunning grace) ────────────────────────────

def test_desired_line_items_attaches_ai_usage(monkeypatch):
    from app.core.config import get_settings
    from app.services.billing.service import _desired_line_items
    monkeypatch.setattr(get_settings(), "stripe_module_prices", {
        "finance": "price_fin", "chat": "price_chat", "ai_usage": "price_ai",
    })
    items = _desired_line_items({"finance", "chat"}, False)
    prices = [li["price"] for li in items]
    assert "price_chat" in prices and "price_ai" in prices
    # Metered item carries no quantity.
    assert "quantity" not in next(li for li in items if li["price"] == "price_ai")
    # No metered module selected → no ai_usage item.
    assert all(li["price"] != "price_ai" for li in _desired_line_items({"finance"}, False))


@pytest.mark.asyncio
async def test_past_due_keeps_module_access(user_a, db_session_factory, billing_on):
    """Dunning grace: a `past_due` subscription keeps its modules while Stripe retries."""
    from app.models.billing import Subscription
    from app.core.entitlements import get_entitled_modules
    async with db_session_factory() as db:
        db.add(Subscription(user_id=user_a.id, plan="pro", status="past_due", modules=["finance", "chat"]))
        await db.commit()
    async with db_session_factory() as db:
        mods = await get_entitled_modules(db, _principal(user_a))
    assert mods == {"finance", "chat"}


@pytest.mark.asyncio
async def test_canceled_loses_paid_modules(user_a, db_session_factory, billing_on):
    """A canceled subscription drops to the free tier (no paid modules retained)."""
    from app.models.billing import Subscription
    from app.core.entitlements import get_entitled_modules
    async with db_session_factory() as db:
        db.add(Subscription(user_id=user_a.id, plan="pro", status="canceled", modules=["finance", "chat", "business"]))
        await db.commit()
    async with db_session_factory() as db:
        mods = await get_entitled_modules(db, _principal(user_a))
    assert "business" not in mods and "chat" not in mods


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
