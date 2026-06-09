"""Daily and per-session token budget enforcement."""
import logging
from datetime import date, datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy import text
from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.chat import DailyTokenUsage, ChatSession

logger = logging.getLogger(__name__)


class TokenBudgetExceeded(Exception):
    def __init__(self, message: str, retry_after: int = 3600):
        super().__init__(message)
        self.retry_after = retry_after


class SessionTokenLimitExceeded(Exception):
    pass


def _seconds_until_midnight() -> int:
    now = datetime.utcnow()
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now).total_seconds())


async def get_daily_tokens_used(day: date) -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DailyTokenUsage).where(DailyTokenUsage.usage_date == day))
        row = result.scalar_one_or_none()
        return row.tokens_used if row else 0


async def get_session_tokens_used(session_id: UUID) -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ChatSession).where(ChatSession.id == session_id))
        row = result.scalar_one_or_none()
        return row.tokens_used if row else 0


async def check_budget(session_id: UUID, estimated_input: int = 1000) -> None:
    settings = get_settings()
    today = date.today()
    daily_used = await get_daily_tokens_used(today)

    if daily_used + estimated_input > settings.claude_daily_token_limit:
        reset_in = _seconds_until_midnight()
        raise TokenBudgetExceeded(
            f"Daily limit of {settings.claude_daily_token_limit:,} tokens reached. "
            f"Resets in {reset_in // 3600}h {(reset_in % 3600) // 60}m.",
            retry_after=reset_in,
        )

    session_used = await get_session_tokens_used(session_id)
    if session_used + estimated_input > settings.claude_session_token_limit:
        raise SessionTokenLimitExceeded(
            "Session context is full. Start a new session to continue."
        )


async def record_usage(session_id: UUID, input_tokens: int, output_tokens: int) -> None:
    total = input_tokens + output_tokens
    today = date.today()
    now = datetime.utcnow()

    async with AsyncSessionLocal() as session:
        # Upsert daily usage
        result = await session.execute(select(DailyTokenUsage).where(DailyTokenUsage.usage_date == today))
        daily = result.scalar_one_or_none()
        if daily:
            daily.tokens_used += total
            daily.updated_at = now
        else:
            daily = DailyTokenUsage(usage_date=today, tokens_used=total, updated_at=now)
        session.add(daily)

        # Update session
        sess_result = await session.execute(select(ChatSession).where(ChatSession.id == session_id))
        chat_session = sess_result.scalar_one_or_none()
        if chat_session:
            chat_session.tokens_used += total
            chat_session.input_tokens += input_tokens
            chat_session.output_tokens += output_tokens
            chat_session.last_message_at = now
            session.add(chat_session)

        await session.commit()


async def get_token_budget_status() -> dict:
    settings = get_settings()
    today = date.today()
    used = await get_daily_tokens_used(today)
    limit = settings.claude_daily_token_limit
    reset_in = _seconds_until_midnight()
    return {
        "used_today": used,
        "daily_limit": limit,
        "percent": round(used / limit * 100, 1) if limit else 0,
        "reset_in_seconds": reset_in,
    }
