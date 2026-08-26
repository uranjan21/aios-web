"""S12 — every timestamp in this schema is naive UTC.

Migration `n002_timestamp_normalisation` converted the last seven tz-aware
tables (`projects`, `sprints`, `tasks`, `workspace_milestones`, `plan_blocks`,
`career_journal_entries`, `saved_quotes`) to `TIMESTAMP WITHOUT TIME ZONE`,
which is what the other ~200 timestamp columns have used since
`6e3b68412e0d`/`71fb288f8d09`.

These tests pin BOTH halves of that: the schema-level invariant that nothing
tz-aware comes back, and the behavioural one that a value round-trips through
the API without shifting and can be compared against a timestamp from another
domain. Reintroducing `TIMESTAMP(timezone=True)` on any model, or an aware
`datetime.now(timezone.utc)` write, fails here.
"""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import DateTime
from sqlmodel import SQLModel


# ── Schema invariant ─────────────────────────────────────────────────────────

def test_no_model_declares_a_tz_aware_timestamp():
    """The single guard against the mixed schema coming back.

    SQLModel metadata is what `tests/conftest.py` builds SQLite from, so a
    mismatch here means the suite is not testing production. Fails the moment
    someone writes `Column(TIMESTAMP(timezone=True))` on any model.
    """
    aware = [
        f"{table.name}.{col.name}"
        for table in SQLModel.metadata.tables.values()
        for col in table.columns
        if isinstance(col.type, DateTime) and col.type.timezone
    ]
    assert aware == [], (
        "tz-aware columns found — the schema convention is naive UTC "
        f"(see alembic/versions/n002_timestamp_normalisation.py): {aware}"
    )


def test_the_seven_normalised_tables_are_covered_by_that_invariant():
    """Names the tables S12 was about, so the guard above cannot be quietly
    narrowed by dropping a model from the metadata."""
    expected = {
        "projects", "sprints", "tasks", "workspace_milestones", "plan_blocks",
        "career_journal_entries", "saved_quotes",
    }
    present = set(SQLModel.metadata.tables) & expected
    assert present == expected, f"missing from metadata: {expected - present}"


# The `client_a` fixture (a directly-minted JWT) is used rather than
# `auth_client`: that one POSTs to /api/auth/login, which is rate-limited to
# 10/min, and the shared budget is already near its ceiling across the suite.

# ── Behaviour ────────────────────────────────────────────────────────────────

def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value)


@pytest.mark.asyncio
async def test_workspace_task_timestamps_are_naive_and_do_not_shift(client_a):
    before = datetime.utcnow() - timedelta(seconds=5)
    resp = await client_a.post(
        "/api/workspace/tasks", json={"title": "S12 timestamp probe"}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    created = _parse(body["created_at"])
    assert created.tzinfo is None, f"aware timestamp on the wire: {body['created_at']}"
    # A tz mislabelling would show as a whole-hour jump, not a few seconds.
    assert before <= created <= datetime.utcnow() + timedelta(seconds=5)

    # And it survives a re-read unchanged — no conversion on the way back out.
    listed = await client_a.get("/api/workspace/tasks")
    assert listed.status_code == 200
    match = next(r for r in listed.json() if r["id"] == body["id"])
    assert _parse(match["created_at"]) == created


@pytest.mark.asyncio
async def test_saved_quote_timestamp_is_naive(client_a):
    resp = await client_a.post(
        "/api/quotes", json={"text": "S12 probe", "author": "test"}
    )
    assert resp.status_code == 201, resp.text
    saved_at = _parse(resp.json()["saved_at"])
    assert saved_at.tzinfo is None
    assert abs(saved_at - datetime.utcnow()) < timedelta(minutes=1)


@pytest.mark.asyncio
async def test_journal_entry_timestamps_are_naive_through_create_and_patch(client_a):
    """`career_journal_entries` was the one genuinely tz-aware writer."""
    resp = await client_a.post(
        "/api/areas/career/journal",
        json={"body": "S12 probe entry", "entry_date": "2026-08-23"},
    )
    assert resp.status_code in (200, 201), resp.text
    created = resp.json()
    assert _parse(created["created_at"]).tzinfo is None
    assert _parse(created["updated_at"]).tzinfo is None

    patched = await client_a.patch(
        f"/api/areas/career/journal/{created['id']}", json={"title": "renamed"}
    )
    assert patched.status_code == 200, patched.text
    updated = _parse(patched.json()["updated_at"])
    assert updated.tzinfo is None, "PATCH reintroduced an aware timestamp"
    assert abs(updated - datetime.utcnow()) < timedelta(minutes=1)


@pytest.mark.asyncio
async def test_a_workspace_timestamp_compares_against_another_domain(client_a):
    """The actual S12 defect: naive and aware values in one comparison.

    A workspace task and a career journal entry are two different domains that
    used to sit on opposite sides of the naive/aware split. Subtracting one
    from the other raises `TypeError: can't subtract offset-naive and
    offset-aware datetimes` the moment either side regresses.
    """
    task = await client_a.post(
        "/api/workspace/tasks", json={"title": "S12 cross-domain probe"}
    )
    assert task.status_code == 200, task.text
    entry = await client_a.post(
        "/api/areas/career/journal",
        json={"body": "S12 cross-domain probe", "entry_date": "2026-08-23"},
    )
    assert entry.status_code in (200, 201), entry.text

    workspace_ts = _parse(task.json()["created_at"])
    career_ts = _parse(entry.json()["created_at"])
    delta = abs(workspace_ts - career_ts)          # raises if the split returns
    assert delta < timedelta(minutes=5)

    # And both are comparable with the naive UTC "now" the whole codebase uses.
    assert workspace_ts <= datetime.utcnow() + timedelta(seconds=5)
    assert career_ts <= datetime.utcnow() + timedelta(seconds=5)

    # An aware value from the same instant would NOT be comparable — this is
    # what the fix removed, asserted rather than described.
    with pytest.raises(TypeError):
        _ = workspace_ts - datetime.now(timezone.utc)


# ── Writer guards ────────────────────────────────────────────────────────────
#
# The two tests below exist because SQLite LAUNDERS the mistake: its DATETIME
# type ignores `timezone=`, so an aware write through the test harness comes
# back naive and the behavioural tests above stay green while production
# (asyncpg + a real `TIMESTAMP WITHOUT TIME ZONE` column) would reject the
# insert outright. Verified by reintroducing the regression and watching the
# API tests pass. So the writers are pinned directly instead.

def test_model_default_factories_produce_naive_values():
    from app.models.career import CareerJournalEntry
    from app.models.quote import SavedQuote
    from app.models.workspace import Milestone, PlanBlock, Project, Sprint, Task

    import uuid
    from datetime import date, time

    uid = uuid.uuid4()
    rows = [
        Project(user_id=uid, name="p"),
        Sprint(user_id=uid, project_id=uuid.uuid4(), name="s"),
        Task(user_id=uid, title="t"),
        Milestone(user_id=uid, title="m"),
        PlanBlock(user_id=uid, block_date=date(2026, 8, 23),
                  start_time=time(9), end_time=time(10), title="b"),
        CareerJournalEntry(user_id=uid, entry_date=date(2026, 8, 23), body="j"),
    ]
    for row in rows:
        for field in ("created_at", "updated_at"):
            value = getattr(row, field)
            assert value.tzinfo is None, f"{type(row).__name__}.{field} is tz-aware"

    assert SavedQuote(user_id=uid, text="q").saved_at.tzinfo is None


def test_the_normalised_routers_never_write_an_aware_now():
    """`datetime.now(timezone.utc)` in these modules would be an aware value
    heading for a naive column — the exact defect n002 removed."""
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent / "app" / "api"
    modules = [root / "workspace.py", root / "quotes.py", root / "areas" / "career.py"]
    offenders = [
        f"{path.name}:{i}"
        for path in modules
        for i, line in enumerate(path.read_text().splitlines(), 1)
        if "datetime.now(timezone.utc)" in line
    ]
    assert offenders == [], (
        "aware timestamp writes found; these columns are naive UTC — "
        f"use datetime.utcnow(): {offenders}"
    )
