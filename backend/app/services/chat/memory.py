"""Token accounting for chat.

BYOK note (2026-08): this module used to *enforce* a daily/session token budget
on the operator's key — that was a spend cap, and with every call now billed to
the user's own provider account there is nobody to protect from it. The counters
are kept because they are also the only place the user can see their own
consumption (`GET /api/chat/token-budget`, the line under the composer). So:
accounting yes, enforcement no.
"""
import logging
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.chat import DailyTokenUsage, ChatSession

logger = logging.getLogger(__name__)


def _seconds_until_midnight() -> int:
    now = datetime.utcnow()
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now).total_seconds())


async def get_daily_tokens_used(user_id: UUID, day: date) -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DailyTokenUsage).where(DailyTokenUsage.user_id == user_id).where(DailyTokenUsage.usage_date == day))
        row = result.scalar_one_or_none()
        return row.tokens_used if row else 0


async def get_session_tokens_used(user_id: UUID, session_id: UUID) -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ChatSession).where(ChatSession.user_id == user_id).where(ChatSession.id == session_id))
        row = result.scalar_one_or_none()
        return row.tokens_used if row else 0


async def record_usage(
    user_id: UUID,
    session_id: UUID,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """Record what a completed turn actually consumed. Never raises upward —
    a failed counter must not lose the user a response they already paid for."""
    total_actual = input_tokens + output_tokens
    today = date.today()
    now = datetime.utcnow()

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DailyTokenUsage).where(DailyTokenUsage.user_id == user_id).where(DailyTokenUsage.usage_date == today))
        daily = result.scalar_one_or_none()
        if daily:
            daily.tokens_used = daily.tokens_used + total_actual
            daily.updated_at = now
        else:
            daily = DailyTokenUsage(user_id=user_id, usage_date=today, tokens_used=total_actual, updated_at=now)
        session.add(daily)

        sess_result = await session.execute(select(ChatSession).where(ChatSession.user_id == user_id).where(ChatSession.id == session_id))
        chat_session = sess_result.scalar_one_or_none()
        if chat_session:
            chat_session.tokens_used += total_actual
            chat_session.input_tokens += input_tokens
            chat_session.output_tokens += output_tokens
            chat_session.last_message_at = now
            session.add(chat_session)

        await session.commit()


async def get_token_budget_status(user_id: UUID) -> dict:
    """The user's own consumption for today. `daily_limit` is a reference
    figure for the UI gauge, not a cap — nothing rejects a request on it."""
    settings = get_settings()
    today = date.today()
    used = await get_daily_tokens_used(user_id, today)
    limit = settings.claude_daily_token_limit
    reset_in = _seconds_until_midnight()
    return {
        "used_today": used,
        "daily_limit": limit,
        "percent": round(used / limit * 100, 1) if limit else 0,
        "reset_in_seconds": reset_in,
    }
