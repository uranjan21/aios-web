"""Adherence is the whole point of the routine layer, and its rules are the
kind that look like rounding decisions until they misreport someone's month.

Each test below pins one rule that a naive implementation gets wrong:
  - no plan  -> adherence is UNKNOWN, not 0%
  - a routine cannot be missed on days before it existed
  - today is still open, so it cannot be "missed" yet
  - a routine trained on the wrong day is off-schedule, not unplanned
"""
from datetime import date, datetime, timedelta

import pytest
from sqlmodel import select

from app.api.areas.health import workout_adherence
from app.models.health import WorkoutRoutine, RoutineDay, WorkoutSession


async def _routine(session, user, name: str, weekdays: list[int], created_days_ago: int = 60):
    r = WorkoutRoutine(
        user_id=user.id, name=name, is_active=True,
        created_at=datetime.utcnow() - timedelta(days=created_days_ago),
    )
    session.add(r)
    await session.flush()
    for wd in weekdays:
        session.add(RoutineDay(user_id=user.id, routine_id=r.id, weekday=wd))
    await session.commit()
    await session.refresh(r)
    return r


async def _log(session, user, routine, when: date, name="Session"):
    s = WorkoutSession(
        user_id=user.id, name=name,
        routine_id=routine.id if routine else None,
        logged_at=datetime.combine(when, datetime.min.time()).replace(hour=18),
    )
    session.add(s)
    await session.commit()
    return s


async def _clear(session, user):
    for model in (WorkoutSession, RoutineDay, WorkoutRoutine):
        for row in (await session.execute(select(model).where(model.user_id == user.id))).scalars().all():
            await session.delete(row)
    await session.commit()


@pytest.mark.asyncio
async def test_no_routines_reports_unknown_not_zero(db_session_factory, user_a):
    async with db_session_factory() as s:
        await _clear(s, user_a)
        res = await workout_adherence(days=28, current_user=user_a, db=s)
    # 0% would accuse someone with no routines of failing at something.
    assert res["adherence_pct"] is None
    assert res["planned_total"] == 0


@pytest.mark.asyncio
async def test_days_before_the_routine_existed_do_not_count(db_session_factory, user_a):
    async with db_session_factory() as s:
        await _clear(s, user_a)
        # Every weekday, but created only yesterday.
        await _routine(s, user_a, "Brand New", [0, 1, 2, 3, 4, 5, 6], created_days_ago=1)
        res = await workout_adherence(days=28, current_user=user_a, db=s)
    # At most yesterday + today, never the whole 28-day window.
    assert res["planned_total"] <= 2, res["planned_total"]


@pytest.mark.asyncio
async def test_today_is_not_yet_missed(db_session_factory, user_a):
    today = datetime.utcnow().date()
    async with db_session_factory() as s:
        await _clear(s, user_a)
        await _routine(s, user_a, "Everyday", [today.weekday()])
        res = await workout_adherence(days=28, current_user=user_a, db=s)
    todays = next(d for d in res["days"] if d["date"] == today.isoformat())
    assert todays["planned"], "today should be planned"
    assert todays["missed"] == [], "a day still open cannot have been missed"


@pytest.mark.asyncio
async def test_hit_and_miss_are_counted_separately(db_session_factory, user_a):
    today = datetime.utcnow().date()
    # Two past occurrences of the same weekday: train one, skip the other.
    last_week = today - timedelta(days=7)
    two_weeks = today - timedelta(days=14)
    async with db_session_factory() as s:
        await _clear(s, user_a)
        r = await _routine(s, user_a, "Legs", [last_week.weekday()])
        await _log(s, user_a, r, last_week)
        res = await workout_adherence(days=21, current_user=user_a, db=s)

    hit = next(d for d in res["days"] if d["date"] == last_week.isoformat())
    skipped = next(d for d in res["days"] if d["date"] == two_weeks.isoformat())
    assert [c["name"] for c in hit["completed"]] == ["Legs"]
    assert hit["missed"] == []
    assert [m["name"] for m in skipped["missed"]] == ["Legs"]
    assert res["completed_total"] >= 1 and res["planned_total"] >= 2


@pytest.mark.asyncio
async def test_off_schedule_is_not_the_same_as_unplanned(db_session_factory, user_a):
    today = datetime.utcnow().date()
    wrong_day = (today.weekday() + 3) % 7  # a weekday that is NOT today
    async with db_session_factory() as s:
        await _clear(s, user_a)
        r = await _routine(s, user_a, "Pull Day", [wrong_day])
        await _log(s, user_a, r, today)             # real routine, wrong day
        await _log(s, user_a, None, today, "Ad-hoc cardio")  # no routine at all
        res = await workout_adherence(days=7, current_user=user_a, db=s)

    todays = next(d for d in res["days"] if d["date"] == today.isoformat())
    # Moving leg day is not the same as training with no plan, and collapsing
    # the two would tell a user who rescheduled that they went off-plan.
    assert [x["name"] for x in todays["off_schedule"]] == ["Pull Day"]
    assert [x["name"] for x in todays["unplanned"]] == ["Ad-hoc cardio"]
