"""Career learning + employment rules.

Both models have one derived rule each that a naive implementation gets wrong
in a way that only shows up later, so both are pinned here:
  - a "completed" resource is 100%, whatever progress was typed
  - `is_current` comes from `end_date IS NULL` and is never stored
"""
from datetime import date

import pytest
from sqlmodel import select

from app.api.areas.career import (
    LearningIn, RoleIn, create_learning, update_learning, create_role, list_roles,
)
from app.models.career import LearningResource, EmploymentRole, SkillInventory


async def _clear(session, user):
    for model in (LearningResource, EmploymentRole, SkillInventory):
        for row in (await session.execute(select(model).where(model.user_id == user.id))).scalars().all():
            await session.delete(row)
    await session.commit()


@pytest.mark.asyncio
async def test_completed_resource_is_forced_to_100(db_session_factory, user_a):
    async with db_session_factory() as s:
        await _clear(s, user_a)
        res = await create_learning(
            LearningIn(title="DDIA", kind="book", status="completed", progress_pct=40),
            current_user=user_a, db=s,
        )
    # A "completed" row left at 40% makes every progress roll-up wrong.
    assert res["progress_pct"] == 100
    assert res["completed_at"] is not None


@pytest.mark.asyncio
async def test_progress_is_clamped_and_status_validated(db_session_factory, user_a):
    async with db_session_factory() as s:
        await _clear(s, user_a)
        res = await create_learning(
            LearningIn(title="Over", status="in_progress", progress_pct=180),
            current_user=user_a, db=s,
        )
        assert res["progress_pct"] == 100

        with pytest.raises(Exception):
            await create_learning(
                LearningIn(title="Bad", status="kinda-done"), current_user=user_a, db=s,
            )


@pytest.mark.asyncio
async def test_resource_links_to_a_skill_and_rejects_a_foreign_one(db_session_factory, user_a, user_b):
    async with db_session_factory() as s:
        await _clear(s, user_a)
        mine = SkillInventory(user_id=user_a.id, skill_name="Kubernetes", category="devops", level="day_0")
        theirs = SkillInventory(user_id=user_b.id, skill_name="Rust", category="backend", level="day_0")
        s.add(mine); s.add(theirs)
        await s.commit(); await s.refresh(mine); await s.refresh(theirs)

        res = await create_learning(
            LearningIn(title="CKA", skill_id=mine.id, status="in_progress", progress_pct=35),
            current_user=user_a, db=s,
        )
        assert res["skill_name"] == "Kubernetes"

        # Another user's skill must not be linkable.
        with pytest.raises(Exception):
            await create_learning(
                LearningIn(title="Nope", skill_id=theirs.id), current_user=user_a, db=s,
            )


@pytest.mark.asyncio
async def test_current_role_is_derived_from_a_missing_end_date(db_session_factory, user_a):
    async with db_session_factory() as s:
        await _clear(s, user_a)
        await create_role(
            RoleIn(company="Infosys", title="FE", start_date=date(2021, 6, 1), end_date=date(2024, 3, 31)),
            current_user=user_a, db=s,
        )
        await create_role(
            RoleIn(company="Takeda", title="FS", start_date=date(2024, 4, 1)),
            current_user=user_a, db=s,
        )
        rows = await list_roles(current_user=user_a, db=s)

    # Current sorts first, and "current" is end_date IS NULL — there is no
    # is_current column that could disagree with it.
    assert rows[0]["company"] == "Takeda"
    assert rows[0]["is_current"] is True and rows[0]["end_date"] is None
    assert rows[1]["is_current"] is False
    assert rows[1]["months"] == 33  # Jun 2021 -> Mar 2024


@pytest.mark.asyncio
async def test_end_before_start_is_rejected(db_session_factory, user_a):
    async with db_session_factory() as s:
        await _clear(s, user_a)
        with pytest.raises(Exception):
            await create_role(
                RoleIn(company="X", title="Y", start_date=date(2025, 1, 1), end_date=date(2024, 1, 1)),
                current_user=user_a, db=s,
            )
