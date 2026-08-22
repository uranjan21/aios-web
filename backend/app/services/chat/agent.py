"""Claude API streaming caller + tool loop."""
import asyncio
import json
import logging
from typing import AsyncGenerator
from uuid import UUID

import anthropic
import tiktoken

from app.core.config import get_settings
from app.services.ai.keys import get_user_api_key, list_user_providers
from app.services.ai.openai_client import LLM_STREAM_TIMEOUT_SECONDS, get_anthropic_client
from app.services.chat.context_builder import build_prompt
from app.services.chat.memory import record_usage, get_token_budget_status
from app.services.chat.tools import tool_definitions_for, execute_tool, CONFIRMATION_PENDING

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 8
_RETRYABLE = (anthropic.RateLimitError, anthropic.APIConnectionError)
_HISTORY_TOKEN_LIMIT = 24_000  # trim history above this estimate
_CACHE_MARKER = {"type": "ephemeral"}

try:
    _encoding = tiktoken.get_encoding("cl100k_base")
except Exception:
    _encoding = None


def _count_tokens(text: str) -> int:
    if _encoding:
        return len(_encoding.encode(text))
    return len(text) // 4  # fallback: ~4 chars/token


def _trim_history(history: list[dict]) -> list[dict]:
    """Drop oldest messages until total estimated tokens < _HISTORY_TOKEN_LIMIT."""
    total = sum(_count_tokens(str(m.get("content", ""))) for m in history)
    if total <= _HISTORY_TOKEN_LIMIT:
        return history
    trimmed = list(history)
    # Always keep at least the last 2 exchanges (4 messages)
    while len(trimmed) > 4 and total > _HISTORY_TOKEN_LIMIT:
        removed = trimmed.pop(0)
        total -= _count_tokens(str(removed.get("content", "")))
    return trimmed


def _mark_cache_breakpoint(messages: list[dict]) -> None:
    """Move the message-level cache breakpoint to the last content block.

    Max 4 breakpoints per request, so strip prior markers first. String content
    is converted to block form (required to carry cache_control).
    """
    for m in messages:
        content = m.get("content")
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict):
                    block.pop("cache_control", None)
    if not messages:
        return
    last = messages[-1]
    content = last.get("content")
    if isinstance(content, str):
        if content:
            last["content"] = [{"type": "text", "text": content, "cache_control": dict(_CACHE_MARKER)}]
    elif isinstance(content, list) and content and isinstance(content[-1], dict):
        content[-1]["cache_control"] = dict(_CACHE_MARKER)


async def stream_chat_response(
    user_id: UUID,
    session_id: UUID,
    user_message: str,
    history: list[dict],
    model: str | None = None,
    provider: str | None = None,
    attachments: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    settings = get_settings()
    effective_provider = provider or settings.llm_provider
    claude_model = model or settings.claude_model

    from app.db.session import AsyncSessionLocal
    from sqlmodel import select
    from app.models.user import User

    # BYOK: the turn runs on the user's own key. Which providers they have
    # installed also decides which one we can route to — a stored preference for
    # a provider they never configured must not hard-fail the turn.
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            if user.llm_provider and not provider:
                effective_provider = user.llm_provider
            if user.claude_model and not model:
                claude_model = user.claude_model
        installed = await list_user_providers(session, user_id)

        if effective_provider not in ("openai", "anthropic"):
            effective_provider = "openai"
        if effective_provider not in installed:
            other = "anthropic" if effective_provider == "openai" else "openai"
            if other in installed:
                effective_provider = other
            else:
                yield {
                    "type": "error",
                    "code": "no_api_key",
                    "provider": effective_provider,
                    "message": (
                        f"No {effective_provider} API key configured. "
                        "Add your own key in Settings → AI & knowledge to use chat."
                    ),
                }
                return
        api_key = (
            await get_user_api_key(session, user_id, "anthropic")
            if effective_provider == "anthropic"
            else None
        )

    if effective_provider == "openai":
        from app.services.chat.openai_agent import stream_openai_chat_response

        async for event in stream_openai_chat_response(
            user_id,
            session_id,
            user_message,
            history,
            override_model=model,
            attachments=attachments,
        ):
            yield event
        return

    static_system, dynamic_context, vault_enabled = await build_prompt(
        user_message, user_id, user_name=user.name if user else None
    )
    tools = tool_definitions_for(vault_enabled)

    client = get_anthropic_client(api_key, timeout=LLM_STREAM_TIMEOUT_SECONDS)

    # Dynamic context rides in the latest user message, after the cacheable
    # prefix (tools + system + history). Persisted history stays raw.
    user_content_blocks: list[dict] = [
        {"type": "text", "text": f"<context>\n{dynamic_context}\n</context>"}
    ]
    if attachments:
        for att in attachments:
            content_type = att.get("contentType", "")
            if content_type.startswith("image/") and "data" in att:
                user_content_blocks.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": content_type,
                        "data": att["data"]
                    }
                })
    user_content_blocks.append({"type": "text", "text": user_message})

    messages = _trim_history(history) + [{"role": "user", "content": user_content_blocks}]

    total_input_tokens = 0
    total_output_tokens = 0
    affected_paths: list[str] = []

    try:
        for iteration in range(MAX_TOOL_ITERATIONS):
            _mark_cache_breakpoint(messages)
            # Retry on transient Anthropic API errors
            last_error = None
            for attempt in range(3):
                try:
                    async with client.messages.stream(
                        model=claude_model,
                        max_tokens=4096,
                        system=[{"type": "text", "text": static_system, "cache_control": dict(_CACHE_MARKER)}],
                        tools=tools,
                        messages=messages,
                    ) as stream:
                        tool_calls_in_turn = []
                        assistant_text = ""

                        async for event in stream:
                            if event.type == "content_block_start":
                                if event.content_block.type == "tool_use":
                                    tool_calls_in_turn.append({
                                        "id": event.content_block.id,
                                        "name": event.content_block.name,
                                        "input_buffer": "",
                                    })
                            elif event.type == "content_block_delta":
                                if event.delta.type == "text_delta":
                                    assistant_text += event.delta.text
                                    yield {"type": "chunk", "content": event.delta.text}
                                elif event.delta.type == "input_json_delta" and tool_calls_in_turn:
                                    tool_calls_in_turn[-1]["input_buffer"] += event.delta.partial_json

                        final_message = await stream.get_final_message()
                        usage = final_message.usage
                        total_input_tokens += usage.input_tokens
                        total_output_tokens += usage.output_tokens
                        stop_reason = final_message.stop_reason
                        logger.info(
                            "chat usage user=%s iter=%d input=%s cache_read=%s cache_write=%s output=%s",
                            user_id, iteration, usage.input_tokens,
                            getattr(usage, "cache_read_input_tokens", None),
                            getattr(usage, "cache_creation_input_tokens", None),
                            usage.output_tokens,
                        )
                    last_error = None
                    break  # success

                except _RETRYABLE as e:
                    last_error = e
                    wait = 2 ** (attempt + 1)
                    logger.warning("Claude API error (attempt %d/3), retrying in %ds: %s", attempt + 1, wait, e)
                    await asyncio.sleep(wait)

            if last_error is not None:
                yield {"type": "error", "code": "api_unavailable", "message": "AI service temporarily unavailable. Please try again."}
                return

            if not tool_calls_in_turn or stop_reason != "tool_use":
                break

            tool_results = []
            for tc in tool_calls_in_turn:
                tool_input = {}
                if tc["input_buffer"]:
                    try:
                        tool_input = json.loads(tc["input_buffer"])
                    except json.JSONDecodeError:
                        pass
                tc["input"] = tool_input

                yield {"type": "tool_call", "tool": tc["name"], "input": tool_input}

                try:
                    result_text, paths = await execute_tool(tc["name"], tool_input, user_id)
                    if result_text == CONFIRMATION_PENDING:
                        # Destructive tool — emit a confirmation request to the client.
                        # The WS handler will store the pending call; the LLM is told
                        # the action is queued so it can acknowledge gracefully.
                        yield {
                            "type": "tool_confirmation_required",
                            "tool": tc["name"],
                            "tool_call_id": tc["id"],
                            "params": tool_input,
                        }
                        result_text = (
                            "Action queued pending user confirmation. "
                            "Tell the user the action is ready to confirm in the chat UI."
                        )
                        paths = []
                    tool_status = "ok"
                    affected_paths.extend(paths)
                except Exception as e:
                    logger.error("Tool %s failed: %s", tc["name"], e)
                    result_text = "Tool execution failed. Please try a different approach."
                    paths = []
                    tool_status = "error"

                yield {
                    "type": "tool_result",
                    "tool": tc["name"],
                    "status": tool_status,
                    "result": result_text,
                    "affected": paths,
                }

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": result_text,
                })

            assistant_content = []
            if assistant_text:
                assistant_content.append({"type": "text", "text": assistant_text})
            for tc in tool_calls_in_turn:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": tc["input"],
                })

            messages = messages + [
                {"role": "assistant", "content": assistant_content},
                {"role": "user", "content": tool_results},
            ]

        updated_budget = await get_token_budget_status(user_id)
        yield {
            "type": "done",
            "tokens": {
                "input": total_input_tokens,
                "output": total_output_tokens,
                "daily_remaining": updated_budget["daily_limit"] - updated_budget["used_today"],
            },
            "affected_paths": affected_paths,
        }

    finally:
        # Always record usage — even if the stream is abandoned mid-response.
        # This is the user's own consumption counter, not a billing meter.
        if total_input_tokens + total_output_tokens > 0:
            try:
                await record_usage(
                    user_id,
                    session_id,
                    total_input_tokens,
                    total_output_tokens,
                )
            except Exception as e:
                logger.error("Failed to record token usage for session %s: %s", session_id, e)
