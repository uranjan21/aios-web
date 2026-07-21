"""Module entitlements.

Modular pricing model: a user owns a *set of modules* (5 areas + 3 services).
Access is derived from the entitled module set — `require_module(key)` gates a
router/endpoint and returns **402** with the module key so the frontend can show
a targeted upgrade wall.

Both `require_module` and the legacy `require_plan` are **no-ops until billing is
configured** (`settings.billing_enabled`), so dev / self-host installs keep full
access until the operator sets Stripe keys.

Phase 0 note: until the modular billing model ships (Phase 1 — `Subscription.modules`
+ Stripe rework), the entitled set is *derived* from the existing
`Subscription.plan` + `addons`. The enforcement points (this module, wired into
every area/service router) are the security fix; the storage migration follows
with the Stripe work.
"""
import uuid as _uuid

from fastapi import Depends, HTTPException, WebSocket, status
from sqlmodel import select

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db

# ── Module catalog ────────────────────────────────────────────────────────────
# Business and Content were retired from the product on 2026-07-21. Their
# tables and any historical `modules` rows survive, so a stored subscription
# may still list them — the `& set(ALL_MODULES)` intersections below drop the
# stale keys instead of granting access to routers that no longer exist.
AREA_MODULES = ("finance", "health", "career")
SERVICE_MODULES = ("chat", "agents", "integrations")
ALL_MODULES: frozenset[str] = frozenset(AREA_MODULES + SERVICE_MODULES)
BUNDLE_KEY = "everything"

ACTIVE_STATUSES = {"active", "trialing"}
# During `past_due` Stripe is still retrying payment — keep access (grace) rather
# than cutting the user off mid-dunning. The frontend surfaces a "payment failed"
# prompt off the subscription status.
GRACE_STATUSES = ACTIVE_STATUSES | {"past_due"}

# Maps the legacy plan rank → owned modules. Pro/Pro Plus unlock the core areas
# plus all services; Household takes everything.
_PLAN_MODULES = {
    "free": {"finance", "health", "career"},
    "pro": {"finance", "health", "career", "chat", "agents", "integrations"},
    "pro_plus": {"finance", "health", "career", "chat", "agents", "integrations"},
    "household": set(ALL_MODULES),
}


def _modules_for(plan: str, addons, sub_status: str) -> set[str]:
    """Derive the owned module set from the legacy subscription fields."""
    if sub_status not in ACTIVE_STATUSES:
        plan = "free"
    mods = set(_PLAN_MODULES.get(plan, _PLAN_MODULES["free"]))
    # Legacy add-on keys still intersect against the live catalog.
    mods |= {a for a in (addons or []) if a in ALL_MODULES}
    return mods & set(ALL_MODULES)


# ── Legacy rank-based gating (kept for `ai.py`; still inert until billing on) ──
PLAN_RANK = {"free": 0, "pro": 1, "pro_plus": 1, "household": 2}

PLAN_FEATURES = {
    "free": {"domains": 1, "history_days": 30, "ai": False, "integrations": False, "agents": False},
    "pro": {"domains": 5, "history_days": None, "ai": True, "integrations": True, "agents": True},
    "household": {"domains": 5, "history_days": None, "ai": True, "integrations": True, "agents": True, "household": True},
}


def plan_rank(plan: str) -> int:
    return PLAN_RANK.get(plan, 0)


def require_plan(min_plan: str):
    """FastAPI dependency that 402s if the user's plan rank is below `min_plan`.

    Inert when billing is disabled or for admins. Retained for AI endpoints; new
    code should prefer `require_module`.
    """
    async def _dependency(current_user=Depends(get_current_user), db=Depends(get_db)) -> None:
        settings = get_settings()
        if not settings.billing_enabled or current_user.is_admin:
            return
        from app.services.billing.service import get_subscription
        sub = await get_subscription(db, current_user.id)
        effective = sub.plan if (sub and sub.status in ACTIVE_STATUSES) else "free"
        if plan_rank(effective) < plan_rank(min_plan):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"This feature requires the {min_plan.capitalize()} plan",
            )

    return _dependency


# ── Module-based gating (the modular model) ───────────────────────────────────
def modules_for_subscription(sub) -> set[str]:
    """Resolve the entitled module set for a (possibly None) Subscription.

    Source of truth = `modules` / `bundle` / `free_area`. Rows that predate the
    modular migration (`modules is None`) fall back to deriving from `plan`+`addons`.
    A lapsed/None subscription collapses to the free tier (its `free_area`, else
    the legacy free areas).
    """
    active = bool(sub) and getattr(sub, "status", "active") in GRACE_STATUSES
    if not active:
        free_area = getattr(sub, "free_area", None) if sub else None
        return {free_area} if free_area in ALL_MODULES else _modules_for("free", None, "active")
    if getattr(sub, "bundle", False):
        return set(ALL_MODULES)
    mods: set[str] = set()
    free_area = getattr(sub, "free_area", None)
    if free_area in ALL_MODULES:
        mods.add(free_area)
    sub_modules = getattr(sub, "modules", None)
    if sub_modules is not None:
        mods |= {m for m in sub_modules if m in ALL_MODULES}
    else:  # un-backfilled legacy row
        mods |= _modules_for(getattr(sub, "plan", "free"), getattr(sub, "addons", None), getattr(sub, "status", "active"))
    return mods & set(ALL_MODULES)


async def get_entitled_modules(db, user) -> set[str]:
    """The set of module keys `user` may access right now.

    `user` is any object exposing `.id` and `.is_admin` (CurrentUser or User).
    Admins and billing-disabled installs get everything.
    """
    settings = get_settings()
    if getattr(user, "is_admin", False) or not settings.billing_enabled:
        return set(ALL_MODULES)
    from app.services.billing.service import get_subscription
    sub = await get_subscription(db, user.id)
    return modules_for_subscription(sub)


def require_module(key: str):
    """FastAPI dependency → 402 (with the module key in `detail`) when the user
    isn't entitled to `key`. Inert when billing is disabled or for admins."""
    if key not in ALL_MODULES:
        raise ValueError(f"Unknown module key: {key!r}")

    async def _dependency(current_user=Depends(get_current_user), db=Depends(get_db)) -> None:
        settings = get_settings()
        if not settings.billing_enabled or current_user.is_admin:
            return
        entitled = await get_entitled_modules(db, current_user)
        if key not in entitled:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={"error": "module_required", "module": key},
            )

    return _dependency


async def ws_entitled(user_id, key: str) -> bool:
    """Standalone entitlement check for WebSocket handlers (no `Depends`).

    Returns True (allow) when billing is disabled. Loads the user to honour the
    admin bypass and resolve the subscription.
    """
    settings = get_settings()
    if not settings.billing_enabled:
        return True
    from app.db.session import AsyncSessionLocal
    from app.models.user import User
    try:
        uid = user_id if isinstance(user_id, _uuid.UUID) else _uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        return False
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            return False
        entitled = await get_entitled_modules(db, user)
        return key in entitled
