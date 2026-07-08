"""Claude API streaming caller + tool loop."""
import asyncio
import json
import logging
from typing import AsyncGenerator
from uuid import UUID

import anthropic
import tiktoken

from app.core.config import get_settings
from app.services.chat.context_builder import build_system_prompt
from app.services.chat.memory import reserve_budget, record_usage, get_token_budget_status, ESTIMATED_TOKENS
from app.services.chat.tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 8
_RETRYABLE = (anthropic.RateLimitError, anthropic.APIConnectionError)
_HISTORY_TOKEN_LIMIT = 24_000  # trim history above this estimate

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


async def stream_chat_response(
    user_id: UUID,
    session_id: UUID,
    user_message: str,
    history: list[dict],
) -> AsyncGenerator[dict, None]:
    settings = get_settings()

    if settings.llm_provider == "openai":
        from app.services.chat.openai_agent import stream_openai_chat_response

        async for event in stream_openai_chat_response(user_id, session_id, user_message, history):
            yield event
        return

    try:
        await reserve_budget(user_id, session_id, estimated_input=ESTIMATED_TOKENS)
    except Exception as e:
        yield {"type": "error", "code": "token_budget_exceeded", "message": str(e)}
        return

    system_prompt = await build_system_prompt(user_message, user_id=user_id)

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    messages = _trim_history(history) + [{"role": "user", "content": user_message}]

    total_input_tokens = 0
    total_output_tokens = 0
    affected_paths: list[str] = []

    try:
        for iteration in range(MAX_TOOL_ITERATIONS):
            # Retry on transient Anthropic API errors
            last_error = None
            for attempt in range(3):
                try:
                    async with client.messages.stream(
                        model=settings.claude_model,
                        max_tokens=4096,
                        system=system_prompt,
                        tools=TOOL_DEFINITIONS,
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
                        total_input_tokens += final_message.usage.input_tokens
                        total_output_tokens = final_message.usage.output_tokens
                        stop_reason = final_message.stop_reason
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

                yield {"type": "tool_call", "tool": tc["name"], "input": tool_input}

                try:
                    result_text, paths = await execute_tool(tc["name"], tool_input, user_id)
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
                    "input": json.loads(tc["input_buffer"]) if tc["input_buffer"] else {},
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
        # Always record usage — even if stream is abandoned mid-response
        if total_input_tokens + total_output_tokens > 0:
            try:
                await record_usage(
                    user_id,
                    session_id,
                    total_input_tokens,
                    total_output_tokens,
                    pre_reserved=ESTIMATED_TOKENS,
                )
            except Exception as e:
                logger.error("Failed to record token usage for session %s: %s", session_id, e)
