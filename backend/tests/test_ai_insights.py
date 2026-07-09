from types import SimpleNamespace

import pytest

from app.core.config import get_settings
from app.services.ai.insights import generate_text


@pytest.mark.asyncio
async def test_generate_text_uses_anthropic_when_openai_key_missing(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
    monkeypatch.setattr(settings, "claude_model", "claude-test")

    calls = {}

    class FakeMessages:
        async def create(self, **kwargs):
            calls.update(kwargs)
            return SimpleNamespace(content=[SimpleNamespace(type="text", text="anthropic narrative")])

    class FakeAnthropic:
        def __init__(self, api_key):
            calls["api_key"] = api_key
            self.messages = FakeMessages()

    monkeypatch.setattr("anthropic.AsyncAnthropic", FakeAnthropic)

    text = await generate_text("system prompt", "user facts", max_tokens=123)

    assert text == "anthropic narrative"
    assert calls["api_key"] == "sk-ant-test"
    assert calls["model"] == "claude-test"
    assert calls["system"] == "system prompt"
    assert calls["messages"] == [{"role": "user", "content": "user facts"}]
    assert calls["max_tokens"] == 123
