"""Regressions for the 2026-08-16 audit remediation.

Each test pins a fix whose failure mode is silent: an SSRF-shaped push endpoint
that only shows up as an outbound request, an oversized chat frame that only
shows up on the provider bill, and two finance write paths that returned 200
while writing something the caller did not ask for.
"""
import json
import uuid
from datetime import datetime
from decimal import Decimal

import pytest
from sqlmodel import select

from app.models.finance import (
    Account,
    AccountType,
    Category,
    FinanceExpense,
    FinancePendingTransaction,
)


# ── Web push: the endpoint is an outbound request target ──────────────────────

_KEYS = {"p256dh": "BPk-test-p256dh-value", "auth": "auth-test-value"}


@pytest.mark.asyncio
async def test_push_rejects_cloud_metadata_endpoint(client_a):
    """The server POSTs to whatever `endpoint` says, so an unvalidated value is
    an authenticated SSRF primitive — link-local metadata is the canonical
    target."""
    resp = await client_a.post("/api/push/subscribe", json={
        "endpoint": "https://169.254.169.254/latest/meta-data/iam/security-credentials/",
        "keys": _KEYS,
    })
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_push_rejects_non_https_endpoint(client_a):
    resp = await client_a.post("/api/push/subscribe", json={
        "endpoint": "http://fcm.googleapis.com/fcm/send/abc123",
        "keys": _KEYS,
    })
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_push_rejects_unknown_host(client_a):
    resp = await client_a.post("/api/push/subscribe", json={
        "endpoint": "https://attacker.example.com/fcm/send/abc123",
        "keys": _KEYS,
    })
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_push_accepts_a_real_fcm_endpoint(client_a, user_a, db_session_factory):
    """The allowlist must not be so tight that the real thing bounces."""
    from app.models.push import PushSubscription

    endpoint = f"https://fcm.googleapis.com/fcm/send/{uuid.uuid4().hex}"
    resp = await client_a.post("/api/push/subscribe", json={
        "endpoint": endpoint, "keys": _KEYS,
    })
    assert resp.status_code == 200, resp.text

    async with db_session_factory() as db:
        row = (await db.execute(select(PushSubscription).where(
            PushSubscription.user_id == user_a.id,
            PushSubscription.endpoint == endpoint,
        ))).scalar_one_or_none()
        assert row is not None


@pytest.mark.asyncio
async def test_push_subscription_cap_is_enforced(client_a, user_a, db_session_factory):
    """Nothing bounded this before — every stored row is one fan-out request per
    notification."""
    from app.api.push import MAX_SUBSCRIPTIONS_PER_USER
    from app.models.push import PushSubscription

    async with db_session_factory() as db:
        for i in range(MAX_SUBSCRIPTIONS_PER_USER):
            db.add(PushSubscription(
                user_id=user_a.id,
                endpoint=f"https://fcm.googleapis.com/fcm/send/seeded-{i}",
                p256dh=_KEYS["p256dh"], auth=_KEYS["auth"],
            ))
        await db.commit()

    over = await client_a.post("/api/push/subscribe", json={
        "endpoint": "https://fcm.googleapis.com/fcm/send/one-too-many",
        "keys": _KEYS,
    })
    assert over.status_code == 409, over.text

    # An UPDATE to an already-registered endpoint is not a new row and must
    # still be allowed at the cap.
    again = await client_a.post("/api/push/subscribe", json={
        "endpoint": "https://fcm.googleapis.com/fcm/send/seeded-0",
        "keys": {"p256dh": "rotated", "auth": "rotated"},
    })
    assert again.status_code == 200, again.text


# ── Chat WS: an oversized frame must never reach the provider ─────────────────

class _FakeWebSocket:
    """Minimal WebSocket stand-in: replays queued client frames, records sends."""

    def __init__(self, frames: list[str]):
        self._frames = list(frames)
        self.sent: list[dict] = []
        self.accepted = False

    async def accept(self) -> None:
        self.accepted = True

    async def receive_text(self) -> str:
        if not self._frames:
            from fastapi import WebSocketDisconnect
            raise WebSocketDisconnect(code=1000)
        return self._frames.pop(0)

    async def send_text(self, text: str) -> None:
        self.sent.append(json.loads(text))


@pytest.mark.asyncio
async def test_chat_ws_rejects_oversized_content_before_the_llm(app, user_a, monkeypatch):
    """The rate limit counts MESSAGES, so without a size bound a few huge frames
    cost far more provider spend than they meter. Rejection must happen before
    the quota check and before any provider call."""
    import app.api.chat as chat_mod

    called = False

    async def _must_not_run(*args, **kwargs):
        nonlocal called
        called = True
        yield {"type": "done"}

    monkeypatch.setattr(chat_mod, "stream_chat_response", _must_not_run)

    ws = _FakeWebSocket([json.dumps({
        "type": "message",
        "content": "x" * (chat_mod.MAX_MESSAGE_CHARS + 1),
    })])
    await chat_mod.chat_ws_handler(ws, str(user_a.id))

    assert called is False, "the provider was called with an oversized frame"
    assert [m.get("code") for m in ws.sent] == ["too_large"]


@pytest.mark.asyncio
async def test_chat_ws_rejects_oversized_attachments(app, user_a, monkeypatch):
    import app.api.chat as chat_mod

    called = False

    async def _must_not_run(*args, **kwargs):
        nonlocal called
        called = True
        yield {"type": "done"}

    monkeypatch.setattr(chat_mod, "stream_chat_response", _must_not_run)

    # base64 expands 3 bytes to 4 chars, so this decodes to just over the cap.
    b64_chars = (chat_mod.MAX_ATTACHMENT_BYTES // 3 + 16) * 4
    ws = _FakeWebSocket([json.dumps({
        "type": "message",
        "content": "hi",
        "attachments": [{"name": "big.png", "data": "A" * b64_chars}],
    })])
    await chat_mod.chat_ws_handler(ws, str(user_a.id))

    assert called is False
    assert [m.get("code") for m in ws.sent] == ["too_large"]


# ── Finance: a 200 must not hide a write the caller did not ask for ───────────

async def _seed_account(db_session_factory, user_id, balance="10000.00"):
    async with db_session_factory() as db:
        acct = Account(user_id=user_id, name="HDFC", type=AccountType.CHECKING,
                       balance=Decimal(balance))
        db.add(acct)
        await db.commit()
        await db.refresh(acct)
        return acct


@pytest.mark.asyncio
async def test_approve_rejects_an_account_the_user_does_not_own(
    client_a, user_a, user_b, db_session_factory
):
    """`_approve_one` never ownership-checked the account, so an id belonging to
    another tenant (or to nobody) wrote a ledger row while `apply_balance`
    silently declined to move any balance — a 200 hiding an inconsistency."""
    foreign = await _seed_account(db_session_factory, user_b.id)

    async with db_session_factory() as db:
        pending = FinancePendingTransaction(
            user_id=user_a.id, amount=Decimal("500.00"), transaction_type="expense",
            payee_name="Coffee", logged_at=datetime(2026, 7, 20, 9, 0, 0),
            raw_email_snippet="Rs.500 debited", status="pending", description="Coffee",
        )
        db.add(pending)
        await db.commit()
        await db.refresh(pending)

    resp = await client_a.post(
        f"/api/areas/finance/pending/{pending.id}/approve",
        json={"account_id": str(foreign.id)},
    )
    assert resp.status_code == 404, resp.text

    async with db_session_factory() as db:
        assert (await db.execute(select(FinanceExpense).where(
            FinanceExpense.user_id == user_a.id))).scalars().first() is None
        assert (await db.get(FinancePendingTransaction, pending.id)).status == "pending"
        # And the other tenant's balance is untouched.
        assert (await db.get(Account, foreign.id)).balance == Decimal("10000.00")


@pytest.mark.asyncio
async def test_approve_rejects_an_unknown_account_id(client_a, user_a, db_session_factory):
    async with db_session_factory() as db:
        pending = FinancePendingTransaction(
            user_id=user_a.id, amount=Decimal("120.00"), transaction_type="expense",
            payee_name="Tea", logged_at=datetime(2026, 7, 21, 9, 0, 0),
            raw_email_snippet="Rs.120 debited", status="pending", description="Tea",
        )
        db.add(pending)
        await db.commit()
        await db.refresh(pending)

    resp = await client_a.post(
        f"/api/areas/finance/pending/{pending.id}/approve",
        json={"account_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_approve_rejects_a_negative_amount(client_a, user_a, db_session_factory):
    """A negative expense amount *increased* the account balance, while every
    other finance create path enforces amount > 0."""
    acct = await _seed_account(db_session_factory, user_a.id)
    async with db_session_factory() as db:
        pending = FinancePendingTransaction(
            user_id=user_a.id, amount=Decimal("300.00"), transaction_type="expense",
            payee_name="Fuel", logged_at=datetime(2026, 7, 22, 9, 0, 0),
            raw_email_snippet="Rs.300 debited", status="pending", description="Fuel",
            account_id=acct.id,
        )
        db.add(pending)
        await db.commit()
        await db.refresh(pending)

    resp = await client_a.post(
        f"/api/areas/finance/pending/{pending.id}/approve", json={"amount": -300},
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_update_expense_rejects_an_unresolvable_category(
    client_a, user_a, db_session_factory
):
    """`_resolve_category` returned (None, None) on a category that did not
    resolve, so a typo'd or foreign UUID CLEARED a correctly-set category and
    returned 200 — a client bug that looked like server data loss."""
    acct = await _seed_account(db_session_factory, user_a.id)
    async with db_session_factory() as db:
        cat = Category(user_id=user_a.id, name="Food", kind="expense")
        db.add(cat)
        await db.commit()
        await db.refresh(cat)

        expense = FinanceExpense(
            user_id=user_a.id, amount=Decimal("450.00"), category="Food",
            category_id=cat.id, account_id=acct.id, description="Lunch",
            logged_at=datetime(2026, 7, 23, 13, 0, 0), source="manual",
        )
        db.add(expense)
        await db.commit()
        await db.refresh(expense)

    resp = await client_a.patch(
        f"/api/areas/finance/expenses/{expense.id}",
        json={"category_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404, resp.text

    async with db_session_factory() as db:
        row = await db.get(FinanceExpense, expense.id)
        assert row.category_id == cat.id, "the correctly-set category was cleared"
        assert row.category == "Food"
