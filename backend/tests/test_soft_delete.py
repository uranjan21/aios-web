"""Soft delete on the financially significant tables (S17 of the 2026-08-16 audit).

Six tables carry `deleted_at`: expenses, income, transfers, bills, loans,
investments. The contract these tests pin down:

1. DELETE hides the row from every read path AND reverses the account balance.
2. POST /{id}/restore un-hides it and re-applies the balance effect.
3. A hidden row is invisible to its owner, not just to other tenants.
4. Restore is ownership-checked like every other finance mutation.
5. The GDPR erasure path still physically removes soft-deleted rows — soft
   delete must not quietly turn account deletion into data retention.
"""
import uuid

import pytest
import pytest_asyncio


# `conftest._isolation_tables()` does not include the bill/loan/investment
# tables (nothing needed them before). Create them on the same shared engine
# rather than editing conftest, which other work is touching concurrently.
@pytest_asyncio.fixture(scope="module", autouse=True)
async def _extra_tables(anyio_backend=None):
    from sqlmodel import SQLModel
    from tests.conftest import _test_engine
    from app.models.finance import (
        BudgetLimit, FinanceBill, FinanceInvestment, FinanceLoan,
        FinancialGoal, InvestmentTransaction, ObligationPayment,
    )

    tables = [m.__table__ for m in (
        BudgetLimit, FinanceBill, FinanceLoan, FinanceInvestment,
        FinancialGoal, InvestmentTransaction, ObligationPayment,
    )]
    async with _test_engine.begin() as conn:
        await conn.run_sync(lambda c: SQLModel.metadata.create_all(c, tables=tables))
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(lambda c: SQLModel.metadata.drop_all(c, tables=tables))


async def _account(client, balance=10000.0, name="Test bank"):
    resp = await client.post(
        "/api/areas/finance/accounts",
        json={"name": name, "type": "savings", "balance": balance},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


async def _balance(client, account_id) -> float:
    resp = await client.get("/api/areas/finance/accounts")
    assert resp.status_code == 200
    return float(next(a["balance"] for a in resp.json() if a["id"] == str(account_id)))


async def _expense(client, account_id, amount=250.0, description="lunch"):
    resp = await client.post(
        "/api/areas/finance/expenses",
        json={"amount": amount, "account_id": str(account_id),
              "category": "Food", "description": description},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── 1. delete hides the row from list AND from the aggregates ───────────────

@pytest.mark.asyncio
async def test_deleted_expense_disappears_from_list_search_and_cashflow(client_a):
    acc = await _account(client_a)
    exp = await _expense(client_a, acc["id"], amount=400.0, description="soft-del-target")

    before = (await client_a.get("/api/areas/finance/cashflow")).json()["expense_total"]

    assert (await client_a.delete(f"/api/areas/finance/expenses/{exp['id']}")).status_code == 200

    listed = (await client_a.get("/api/areas/finance/expenses")).json()["items"]
    assert exp["id"] not in [e["id"] for e in listed]

    ledger = (await client_a.get(f"/api/areas/finance/accounts/{acc['id']}/ledger")).json()
    assert exp["id"] not in [e["id"] for e in ledger["entries"]]

    after = (await client_a.get("/api/areas/finance/cashflow")).json()["expense_total"]
    assert after == pytest.approx(before - 400.0)


@pytest.mark.asyncio
async def test_deleted_expense_leaves_the_budget_status_total(client_a):
    acc = await _account(client_a, name="Budget bank")
    await client_a.put("/api/areas/finance/budgets",
                       json={"category": "Food", "monthly_limit": 100000})
    exp = await _expense(client_a, acc["id"], amount=750.0)

    def spent(payload):
        return next((r["spent"] for r in payload["items"] if r["category"] == "Food"), 0)

    before = spent((await client_a.get("/api/areas/finance/budgets/status")).json())
    await client_a.delete(f"/api/areas/finance/expenses/{exp['id']}")
    after = spent((await client_a.get("/api/areas/finance/budgets/status")).json())

    assert after == pytest.approx(before - 750.0)


# ── 2. the balance is reversed on delete and re-applied on restore ──────────

@pytest.mark.asyncio
async def test_expense_delete_reverses_balance_and_restore_reapplies_it(client_a):
    acc = await _account(client_a, balance=5000.0, name="Balance bank")
    exp = await _expense(client_a, acc["id"], amount=1200.0)

    after_create = await _balance(client_a, acc["id"])
    assert after_create == pytest.approx(3800.0)

    await client_a.delete(f"/api/areas/finance/expenses/{exp['id']}")
    assert await _balance(client_a, acc["id"]) == pytest.approx(5000.0)

    resp = await client_a.post(f"/api/areas/finance/expenses/{exp['id']}/restore")
    assert resp.status_code == 200, resp.text
    assert resp.json()["deleted_at"] is None
    assert await _balance(client_a, acc["id"]) == pytest.approx(3800.0)

    listed = (await client_a.get("/api/areas/finance/expenses")).json()["items"]
    assert exp["id"] in [e["id"] for e in listed]


@pytest.mark.asyncio
async def test_income_delete_reverses_balance_and_restore_reapplies_it(client_a):
    acc = await _account(client_a, balance=1000.0, name="Income bank")
    resp = await client_a.post(
        "/api/areas/finance/income",
        json={"amount": 900.0, "account_id": acc["id"], "source": "Salary"},
    )
    assert resp.status_code == 200, resp.text
    inc = resp.json()
    assert await _balance(client_a, acc["id"]) == pytest.approx(1900.0)

    await client_a.delete(f"/api/areas/finance/income/{inc['id']}")
    assert await _balance(client_a, acc["id"]) == pytest.approx(1000.0)
    assert inc["id"] not in [i["id"] for i in (await client_a.get("/api/areas/finance/income")).json()]

    assert (await client_a.post(f"/api/areas/finance/income/{inc['id']}/restore")).status_code == 200
    assert await _balance(client_a, acc["id"]) == pytest.approx(1900.0)


@pytest.mark.asyncio
async def test_transfer_delete_and_restore_move_both_balances(client_a):
    src = await _account(client_a, balance=8000.0, name="Transfer src")
    dst = await _account(client_a, balance=2000.0, name="Transfer dst")

    resp = await client_a.post(
        "/api/areas/finance/transfers",
        json={"amount": 1500.0, "from_account_id": src["id"], "to_account_id": dst["id"]},
    )
    assert resp.status_code == 200, resp.text
    tr = resp.json()
    assert await _balance(client_a, src["id"]) == pytest.approx(6500.0)
    assert await _balance(client_a, dst["id"]) == pytest.approx(3500.0)

    await client_a.delete(f"/api/areas/finance/transfers/{tr['id']}")
    assert await _balance(client_a, src["id"]) == pytest.approx(8000.0)
    assert await _balance(client_a, dst["id"]) == pytest.approx(2000.0)
    assert tr["id"] not in [t["id"] for t in (await client_a.get("/api/areas/finance/transfers")).json()]

    assert (await client_a.post(f"/api/areas/finance/transfers/{tr['id']}/restore")).status_code == 200
    assert await _balance(client_a, src["id"]) == pytest.approx(6500.0)
    assert await _balance(client_a, dst["id"]) == pytest.approx(3500.0)


# ── 3. hidden from the owner, and from everyone else ────────────────────────

@pytest.mark.asyncio
async def test_soft_deleted_row_is_not_editable_or_re_deletable_by_the_owner(client_a):
    acc = await _account(client_a, name="Owner bank")
    exp = await _expense(client_a, acc["id"], amount=300.0)
    await client_a.delete(f"/api/areas/finance/expenses/{exp['id']}")

    # The filter is on the write paths too, not only on the lists — otherwise a
    # hidden row could still be edited or double-deleted (double-reversing the
    # balance, which is exactly the bug soft delete is supposed to prevent).
    assert (await client_a.patch(f"/api/areas/finance/expenses/{exp['id']}",
                                 json={"amount": 999.0})).status_code == 404
    assert (await client_a.delete(f"/api/areas/finance/expenses/{exp['id']}")).status_code == 404
    assert await _balance(client_a, acc["id"]) == pytest.approx(float(acc["balance"]))


@pytest.mark.asyncio
async def test_soft_deleted_row_is_never_returned_to_another_user(client_a, client_b, db_session_factory, user_b):
    from app.models.finance import Account, FinanceExpense

    async with db_session_factory() as s:
        acc = Account(user_id=user_b.id, name="B bank", type="savings", balance=0)
        s.add(acc)
        await s.commit()
        await s.refresh(acc)
        row = FinanceExpense(user_id=user_b.id, amount=42, category="B secret",
                             description="B soft deleted", account_id=acc.id,
                             logged_at=__import__("datetime").datetime.utcnow())
        s.add(row)
        await s.commit()
        await s.refresh(row)
        rid = row.id

    await client_b.delete(f"/api/areas/finance/expenses/{rid}")

    for payload in (
        (await client_a.get("/api/areas/finance/expenses")).json()["items"],
        (await client_b.get("/api/areas/finance/expenses")).json()["items"],
    ):
        assert str(rid) not in [e["id"] for e in payload]

    # `/transactions/search` is not asserted here: it is raw SQL with Postgres
    # `::text` casts and cannot run on the SQLite harness. Its filter lives in
    # the single `_common_clauses` helper that every branch of the UNION uses.


# ── 4. restore is ownership-checked ────────────────────────────────────────

@pytest.mark.asyncio
async def test_restore_is_ownership_checked(client_a, client_b):
    acc = await _account(client_a, name="Restore-guard bank")
    exp = await _expense(client_a, acc["id"], amount=125.0)
    await client_a.delete(f"/api/areas/finance/expenses/{exp['id']}")

    assert (await client_b.post(f"/api/areas/finance/expenses/{exp['id']}/restore")).status_code == 404
    # And still restorable by the real owner afterwards.
    assert (await client_a.post(f"/api/areas/finance/expenses/{exp['id']}/restore")).status_code == 200


@pytest.mark.asyncio
async def test_restoring_a_live_row_is_404(client_a):
    acc = await _account(client_a, name="Live-restore bank")
    exp = await _expense(client_a, acc["id"], amount=60.0)
    assert (await client_a.post(f"/api/areas/finance/expenses/{exp['id']}/restore")).status_code == 404


# ── 5. bills / loans / investments (no balance effect) ──────────────────────

@pytest.mark.asyncio
async def test_bill_loan_investment_soft_delete_and_restore(client_a):
    bill = (await client_a.post("/api/areas/finance/bills",
                                json={"name": "Internet", "amount": 999, "due_day": 5})).json()
    loan = (await client_a.post("/api/areas/finance/loans",
                                json={"name": "Car", "principal_amount": 500000,
                                      "outstanding_amount": 300000, "interest_rate": 9.5,
                                      "emi_amount": 12000, "emi_day": 7})).json()
    inv = (await client_a.post("/api/areas/finance/investments",
                               json={"name": "Index fund", "invested_amount": 100000,
                                     "current_value": 120000})).json()

    nw_before = (await client_a.get("/api/areas/finance/net-worth")).json()

    for kind, row in (("bills", bill), ("loans", loan), ("investments", inv)):
        assert (await client_a.delete(f"/api/areas/finance/{kind}/{row['id']}")).status_code == 200
        listed = (await client_a.get(f"/api/areas/finance/{kind}")).json()
        ids = [r["id"] for r in (listed["items"] if isinstance(listed, dict) else listed)]
        assert row["id"] not in ids

    nw_after = (await client_a.get("/api/areas/finance/net-worth")).json()
    # Both sides of net worth drop out: the holding stops counting as an asset
    # and the loan stops counting as a liability.
    assert nw_after["investments_total"] == pytest.approx(nw_before["investments_total"] - 120000)
    assert nw_after["loans_outstanding"] == pytest.approx(nw_before["loans_outstanding"] - 300000)

    for kind, row in (("bills", bill), ("loans", loan), ("investments", inv)):
        assert (await client_a.post(f"/api/areas/finance/{kind}/{row['id']}/restore")).status_code == 200

    nw_restored = (await client_a.get("/api/areas/finance/net-worth")).json()
    assert nw_restored["net_worth"] == pytest.approx(nw_before["net_worth"])


# ── 6. GDPR erasure still HARD deletes ─────────────────────────────────────

@pytest.mark.asyncio
async def test_gdpr_erasure_physically_removes_soft_deleted_rows(app, db_session_factory):
    """Soft delete must not turn right-to-erasure into data retention.

    `DELETE /api/auth/me` cannot be called end-to-end on this harness: it lists
    the live tables with `SELECT tablename FROM pg_tables`, which SQLite has no
    answer for. So this drives the exact statement that endpoint emits for each
    table — a raw `DELETE FROM <t> WHERE user_id = :uid`, with no knowledge of
    `deleted_at` — and proves a soft-deleted row does not survive it. It also
    asserts `finance_expenses` is actually in the metadata set the endpoint
    iterates, so the sweep cannot silently skip the table.
    """
    import datetime as _dt
    from sqlalchemy import select as sa_select, func as sa_func
    from sqlmodel import SQLModel
    # NB: `import app.models` here would rebind the local name `app` (the
    # fixture) to the module. Import the submodule under another name.
    import importlib
    importlib.import_module("app.models")
    from app.models.user import User
    from app.models.finance import Account, FinanceExpense
    from app.core.security import hash_password
    from tests.conftest import _client_for

    swept = {t.name for t in SQLModel.metadata.sorted_tables
             if t.name != "users" and "user_id" in t.columns}
    assert "finance_expenses" in swept

    async with db_session_factory() as s:
        user = User(email=f"erase-{uuid.uuid4().hex[:8]}@test.dev", name="erase",
                    auth_provider="email", password_hash=hash_password("testpass123"))
        s.add(user)
        await s.commit()
        await s.refresh(user)
        acc = Account(user_id=user.id, name="Doomed", type="savings", balance=0)
        s.add(acc)
        await s.commit()
        await s.refresh(acc)
        row = FinanceExpense(user_id=user.id, amount=77, category="Food",
                             account_id=acc.id, logged_at=_dt.datetime.utcnow())
        s.add(row)
        await s.commit()
        await s.refresh(row)
        rid, uid = row.id, user.id

    async with _client_for(app, user) as ac:
        assert (await ac.delete(f"/api/areas/finance/expenses/{rid}")).status_code == 200

    async with db_session_factory() as s:
        hidden = (await s.execute(
            sa_select(FinanceExpense).where(FinanceExpense.id == rid)
        )).scalar_one_or_none()
        assert hidden is not None and hidden.deleted_at is not None, "row should be soft-deleted, not gone"

        # The endpoint's statement, minus the string-literal SQL: a bare
        # unconditional DELETE over the table with no `deleted_at` clause.
        # (Core rather than `text()` only so the UUID binds correctly on
        # SQLite, which stores it as 32 hex chars without dashes.)
        await s.execute(
            FinanceExpense.__table__.delete().where(FinanceExpense.__table__.c.user_id == uid)
        )
        await s.commit()

        remaining = (await s.execute(
            sa_select(sa_func.count()).select_from(FinanceExpense).where(FinanceExpense.user_id == uid)
        )).scalar_one()
        assert remaining == 0
