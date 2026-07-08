import asyncio
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["OPENAI_API_KEY"] = "sk-placeholder"
os.environ["LLM_PROVIDER"] = "openai"

from app.services.chat.openai_agent import stream_openai_chat_response

async def test_openai_delta_none():
    print("--- Testing OpenAI delta=None behavior ---")
    
    class FakeChoice:
        def __init__(self, delta=None, finish_reason=None):
            self.delta = delta
            self.finish_reason = finish_reason

    class FakeChunk:
        def __init__(self, choices):
            self.choices = choices

    # Test chunk with delta=None
    chunks = [
        FakeChunk([FakeChoice(delta=None)]),
    ]
    
    async def fake_stream(*args, **kwargs):
        for chunk in chunks:
            yield chunk

    mock_client = MagicMock()
    mock_completions = AsyncMock()
    mock_completions.create.return_value = fake_stream()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = mock_completions
    
    user_id = "00000000-0000-0000-0000-000000000001"
    session_id = "00000000-0000-0000-0000-000000000002"
    
    with patch("app.services.chat.openai_agent.get_openai_client", return_value=mock_client), \
         patch("app.services.chat.openai_agent.reserve_budget", new_callable=AsyncMock), \
         patch("app.services.chat.openai_agent.build_system_prompt", new_callable=AsyncMock, return_value="system"), \
         patch("app.services.chat.openai_agent.record_usage", new_callable=AsyncMock), \
         patch("app.services.chat.openai_agent.get_token_budget_status", new_callable=AsyncMock, return_value={"daily_limit": 10000, "used_today": 2000}):
        
        try:
            events = []
            async for event in stream_openai_chat_response(user_id, session_id, "hi", []):
                events.append(event)
            print("Completed without error. Events:", events)
        except Exception as e:
            print(f"[BUG CONFIRMED] stream_openai_chat_response crashed when delta was None: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_openai_delta_none())
