"""Plan entitlements. `require_plan(...)` is a no-op until billing is configured,
so dev / self-host installs are unaffected until Stripe keys are set.
"""
from fastapi import Depends, HTTPException, status

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db

PLAN_RANK = {"free": 0, "pro": 1, "household": 2}

# What each plan unlocks — surfaced to the frontend and used for gating decisions.
PLAN_FEATURES = {
    "free": {"domains": 1, "history_days": 30, "ai": False, "integrations": False, "agents": False},
    "pro": {"domains": 5, "history_days": None, "ai": True, "integrations": True, "agents": True},
    "household": {"domains": 5, "history_days": None, "ai": True, "integrations": True, "agents": True, "household": True},
}

ACTIVE_STATUSES = {"active", "trialing"}


def plan_rank(plan: str) -> int:
    return PLAN_RANK.get(plan, 0)


def require_plan(min_plan: str):
    """FastAPI dependency that 402s if the user's plan is below `min_plan`.

    Inert when billing is disabled (no Stripe keys), so existing flows keep working
    until the operator turns billing on.
    """
    async def _dependency(current_user=Depends(get_current_user), db=Depends(get_db)) -> None:
        settings = get_settings()
        if not settings.billing_enabled:
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
