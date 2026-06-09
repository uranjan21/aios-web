"""Tests for token budget logic (unit, no DB required)."""
import pytest
from datetime import date
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_get_token_budget_status_structure():
    """get_token_budget_status returns the expected shape."""
    mock_row = MagicMock()
    mock_row.tokens_used = 5000

    with patch("app.services.chat.memory.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_row
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session_cls.return_value = mock_session

        from app.services.chat.memory import get_token_budget_status
        status = await get_token_budget_status()

    assert "used_today" in status
    assert "daily_limit" in status
    assert "percent" in status
    assert "reset_in_seconds" in status
    assert status["used_today"] == 5000
    assert 0 <= status["percent"] <= 100


def test_trim_history_keeps_recent():
    """_trim_history should keep the most recent messages when over budget."""
    from app.services.chat.agent import _trim_history

    # Build a fake history with 20 messages
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": "x" * 5000}
        for i in range(20)
    ]
    trimmed = _trim_history(history)
    # Must keep at least 4 messages
    assert len(trimmed) >= 4
    # Must keep the most recent messages (end of list)
    assert trimmed[-1] == history[-1]
    assert trimmed[-2] == history[-2]


def test_trim_history_no_op_when_short():
    """_trim_history should not modify short history."""
    from app.services.chat.agent import _trim_history

    history = [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi there"},
    ]
    result = _trim_history(history)
    assert result == history
