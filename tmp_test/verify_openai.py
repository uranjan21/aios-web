import asyncio
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

# Set mock env vars
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["OPENAI_API_KEY"] = "sk-placeholder"
os.environ["LLM_PROVIDER"] = "openai"

from app.core.config import get_settings
from app.services.chat.openai_agent import stream_openai_chat_response
from app.services.ai.openai_client import get_openai_client

async def test_openai_usage_missing():
    print("--- Testing OpenAI usage chunk absence ---")
    
    # We mock the OpenAI stream chunks to simulate standard OpenAI responses without include_usage.
    # Chunk choices will contain the typical payload, but usage will be None.
    
    class FakeDelta:
        def __init__(self, content=None, tool_calls=None):
            self.content = content
            self.tool_calls = tool_calls

    class FakeChoice:
        def __init__(self, delta, finish_reason=None):
            self.delta = delta
            self.finish_reason = finish_reason

    class FakeChunk:
        def __init__(self, choices, usage=None):
            self.choices = choices
            self.usage = usage

    # Generate some chunks
    chunks = [
        FakeChunk([FakeChoice(FakeDelta(content="Hello"))]),
        FakeChunk([FakeChoice(FakeDelta(content=" world"))]),
        FakeChunk([FakeChoice(FakeDelta(), finish_reason="stop")]),
    ]
    
    # Mock stream generator
    async def fake_stream(*args, **kwargs):
        for chunk in chunks:
            yield chunk

    # Mock client and completions.create
    mock_client = MagicMock()
    mock_completions = AsyncMock()
    mock_completions.create.return_value = fake_stream()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = mock_completions
    
    user_id = "00000000-0000-0000-0000-000000000001"
    session_id = "00000000-0000-0000-0000-000000000002"
    
    # Mock reserve_budget, build_system_prompt, record_usage
    with patch("app.services.chat.openai_agent.get_openai_client", return_value=mock_client), \
         patch("app.services.chat.openai_agent.reserve_budget", new_callable=AsyncMock) as mock_reserve, \
         patch("app.services.chat.openai_agent.build_system_prompt", new_callable=AsyncMock, return_value="system") as mock_prompt, \
         patch("app.services.chat.openai_agent.record_usage", new_callable=AsyncMock) as mock_record, \
         patch("app.services.chat.openai_agent.get_token_budget_status", new_callable=AsyncMock, return_value={"daily_limit": 10000, "used_today": 2000}) as mock_budget:
        
        events = []
        async for event in stream_openai_chat_response(user_id, session_id, "hi", []):
            events.append(event)
            
        print("Events received:", events)
        print("completions.create called with args:", mock_completions.create.call_args)
        
        # Check if stream_options was requested
        call_kwargs = mock_completions.create.call_args[1]
        print("stream_options in call kwargs:", "stream_options" in call_kwargs)
        
        # Check if record_usage was called
        print("record_usage called:", mock_record.called)
        
        if not mock_record.called:
            print("[BUG CONFIRMED] record_usage was NOT called because total_input_tokens + total_output_tokens == 0!")
        else:
            print("record_usage was called.")

if __name__ == "__main__":
    asyncio.run(test_openai_usage_missing())
