"""Daily and per-session token budget enforcement."""
import logging
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.chat import DailyTokenUsage, ChatSession

logger = logging.getLogger(__name__)

ESTIMATED_TOKENS = 2000  # pre-debit amount per request


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


async def _refund_daily_reservation(user_id: UUID, day: date, amount: int) -> None:
    async with AsyncSessionLocal() as db_session:
        result = await db_session.execute(select(DailyTokenUsage).where(DailyTokenUsage.user_id == user_id).where(DailyTokenUsage.usage_date == day))
        daily = result.scalar_one_or_none()
        if daily:
            daily.tokens_used = max(0, daily.tokens_used - amount)
            daily.updated_at = datetime.utcnow()
            db_session.add(daily)
            await db_session.commit()


async def reserve_budget(user_id: UUID, session_id: UUID, estimated_input: int = ESTIMATED_TOKENS) -> None:
    """Atomically check + pre-debit budget. Raises if over limit.

    Uses SELECT FOR UPDATE inside a transaction so two concurrent requests
    cannot both pass the check before either records usage.
    """
    settings = get_settings()
    today = date.today()
    now = datetime.utcnow()

    async with AsyncSessionLocal() as db_session:
        async with db_session.begin():
            result = await db_session.execute(
                select(DailyTokenUsage)
                .where(DailyTokenUsage.user_id == user_id)
                .where(DailyTokenUsage.usage_date == today)
                .with_for_update()
            )
            daily = result.scalar_one_or_none()
            daily_used = daily.tokens_used if daily else 0

            if daily_used + estimated_input > settings.claude_daily_token_limit:
                reset_in = _seconds_until_midnight()
                raise TokenBudgetExceeded(
                    f"Daily limit of {settings.claude_daily_token_limit:,} tokens reached. "
                    f"Resets in {reset_in // 3600}h {(reset_in % 3600) // 60}m.",
                    retry_after=reset_in,
                )

            if daily:
                daily.tokens_used = daily_used + estimated_input
                daily.updated_at = now
                db_session.add(daily)
            else:
                db_session.add(DailyTokenUsage(
                    user_id=user_id,
                    usage_date=today,
                    tokens_used=estimated_input,
                    updated_at=now,
                ))

    session_used = await get_session_tokens_used(user_id, session_id)
    if session_used + estimated_input > settings.claude_session_token_limit:
        await _refund_daily_reservation(user_id, today, estimated_input)
        raise SessionTokenLimitExceeded(
            "Session context is full. Start a new session to continue."
        )


async def record_usage(
    user_id: UUID,
    session_id: UUID,
    input_tokens: int,
    output_tokens: int,
    pre_reserved: int = ESTIMATED_TOKENS,
) -> None:
    """Correct the pre-reserved budget to the actual token usage."""
    total_actual = input_tokens + output_tokens
    delta = total_actual - pre_reserved
    today = date.today()
    now = datetime.utcnow()

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DailyTokenUsage).where(DailyTokenUsage.user_id == user_id).where(DailyTokenUsage.usage_date == today))
        daily = result.scalar_one_or_none()
        if daily:
            daily.tokens_used = max(0, daily.tokens_used + delta)
            daily.updated_at = now
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
