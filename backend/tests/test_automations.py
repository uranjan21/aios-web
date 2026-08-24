"""Automation rules.

The field name is the whole point of the first test. `AutomationResponse`
returns `template_key`, and both frontend surfaces declared `key` — so the
settings list filtered every rule out and read "No automation rules configured
yet" for everyone, while the bill-reminder toggle in Payables always rendered
off no matter what the user had set. Nothing failed; the feature was simply
never visible. Pinning the name here makes a rename break a test instead.
"""
import pytest


@pytest.mark.asyncio
async def test_rule_response_uses_template_key(client_a):
    res = await client_a.put(
        "/api/automations/bill_reminder_3d", json={"enabled": True, "params": {}}
    )
    assert res.status_code == 200

    body = res.json()
    assert "template_key" in body, "clients index rules by this exact field name"
    assert body["template_key"] == "bill_reminder_3d"
    assert body["enabled"] is True


@pytest.mark.asyncio
async def test_put_upserts_so_a_first_toggle_creates_the_rule(client_a):
    """The settings UI renders a row per template and relies on this upsert —
    a user with no rows must be able to enable their first rule."""
    assert (await client_a.get("/api/automations/")).json() == []

    await client_a.put("/api/automations/payday_snapshot", json={"enabled": True, "params": {}})

    rules = (await client_a.get("/api/automations/")).json()
    assert [r["template_key"] for r in rules] == ["payday_snapshot"]


@pytest.mark.asyncio
async def test_every_engine_template_is_accepted(client_a):
    """The API's catalog must not drift from what the engine can actually run."""
    from app.services.automations.engine import TEMPLATES
    from app.api.automations import TEMPLATE_KEYS

    assert set(TEMPLATES) <= TEMPLATE_KEYS

    for key in TEMPLATES:
        res = await client_a.put(f"/api/automations/{key}", json={"enabled": True, "params": {}})
        assert res.status_code == 200, f"engine template {key} is rejected by the API"


@pytest.mark.asyncio
async def test_unknown_template_is_rejected(client_a):
    res = await client_a.put("/api/automations/not_a_template", json={"enabled": True, "params": {}})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_rules_are_per_account(client_a, client_b):
    await client_a.put("/api/automations/budget_80_push", json={"enabled": True, "params": {}})
    assert (await client_b.get("/api/automations/")).json() == []
