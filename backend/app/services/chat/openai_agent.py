"""OpenAI streaming caller + tool loop."""
import asyncio
import json
import logging
from typing import AsyncGenerator
from uuid import UUID

from openai import APIConnectionError, RateLimitError

from app.core.config import get_settings
from app.services.ai.openai_client import get_openai_client
from app.services.chat.agent import _trim_history
from app.services.chat.context_builder import build_system_prompt
from app.services.chat.memory import (
    ESTIMATED_TOKENS,
    get_token_budget_status,
    record_usage,
    reserve_budget,
)
from app.services.chat.tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 8
_RETRYABLE = (RateLimitError, APIConnectionError)


def _openai_tools() -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["input_schema"],
            },
        }
        for tool in TOOL_DEFINITIONS
    ]


async def stream_openai_chat_response(
    user_id: UUID,
    session_id: UUID,
    user_message: str,
    history: list[dict],
    override_model: str | None = None,
    attachments: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    settings = get_settings()
    openai_model = settings.openai_chat_model
    openai_api_key = settings.openai_api_key

    from app.db.session import AsyncSessionLocal
    from sqlmodel import select
    from app.models.user import User
    from app.core.security import decrypt_token
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            if user.openai_chat_model:
                openai_model = user.openai_chat_model
            if user.openai_api_key_encrypted:
                openai_api_key = decrypt_token(user.openai_api_key_encrypted)

    if override_model:
        openai_model = override_model

    uses_custom_key = bool(user and user.openai_api_key_encrypted)

    if not uses_custom_key:
        try:
            await reserve_budget(user_id, session_id, estimated_input=ESTIMATED_TOKENS)
        except Exception as e:
            # Note: if user uses their own key, they probably shouldn't hit the limit. We can handle bypass later.
            yield {"type": "error", "code": "token_budget_exceeded", "message": str(e)}
            return

    system_prompt = await build_system_prompt(user_message, user_id=user_id)
    client = get_openai_client(api_key=openai_api_key)
    
    user_content_block = []
    if attachments:
        for att in attachments:
            content_type = att.get("contentType", "")
            if content_type.startswith("image/") and "data" in att:
                user_content_block.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{content_type};base64,{att['data']}"
                    }
                })
    if user_content_block:
        user_content_block.append({"type": "text", "text": user_message})
        final_user_content = user_content_block
    else:
        final_user_content = user_message

    messages = _trim_history(history) + [{"role": "user", "content": final_user_content}]

    total_input_tokens = 0
    total_output_tokens = 0
    affected_paths: list[str] = []

    try:
        for _iteration in range(MAX_TOOL_ITERATIONS):
            last_error = None
            assistant_text = ""
            tool_calls_in_turn: list[dict] = []
            finish_reason = None

            for attempt in range(3):
                try:
                    stream = await client.chat.completions.create(
                        model=openai_model,
                        max_tokens=4096,
                        messages=[{"role": "system", "content": system_prompt}, *messages],
                        tools=_openai_tools(),
                        tool_choice="auto",
                        stream=True,
                        stream_options={"include_usage": True},
                    )

                    tool_call_buffers: dict[int, dict] = {}

                    async for chunk in stream:
                        if chunk.usage:
                            total_input_tokens += chunk.usage.prompt_tokens or 0
                            total_output_tokens += chunk.usage.completion_tokens or 0

                        if not chunk.choices:
                            continue

                        choice = chunk.choices[0]
                        delta = getattr(choice, "delta", None)
                        if not delta:
                            continue

                        if delta.content:
                            assistant_text += delta.content
                            yield {"type": "chunk", "content": delta.content}

                        if delta.tool_calls:
                            for tc_delta in delta.tool_calls:
                                idx = tc_delta.index
                                if idx not in tool_call_buffers:
                                    tool_call_buffers[idx] = {
                                        "id": tc_delta.id or "",
                                        "name": tc_delta.function.name if tc_delta.function and tc_delta.function.name else "",
                                        "arguments": "",
                                    }
                                buf = tool_call_buffers[idx]
                                if tc_delta.id:
                                    buf["id"] = tc_delta.id
                                if tc_delta.function:
                                    if tc_delta.function.name:
                                        buf["name"] = tc_delta.function.name
                                    if tc_delta.function.arguments:
                                        buf["arguments"] += tc_delta.function.arguments

                        if choice.finish_reason:
                            finish_reason = choice.finish_reason

                    tool_calls_in_turn = [tool_call_buffers[i] for i in sorted(tool_call_buffers)]
                    last_error = None
                    break

                except _RETRYABLE as e:
                    last_error = e
                    wait = 2 ** (attempt + 1)
                    logger.warning(
                        "OpenAI API error (attempt %d/3), retrying in %ds: %s",
                        attempt + 1,
                        wait,
                        e,
                    )
                    await asyncio.sleep(wait)

            if last_error is not None:
                yield {
                    "type": "error",
                    "code": "api_unavailable",
                    "message": "AI service temporarily unavailable. Please try again.",
                }
                return

            if not tool_calls_in_turn or finish_reason != "tool_calls":
                break

            assistant_message: dict = {"role": "assistant", "content": assistant_text or None}
            assistant_message["tool_calls"] = [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]},
                }
                for tc in tool_calls_in_turn
            ]
            messages.append(assistant_message)

            for tc in tool_calls_in_turn:
                tool_input = {}
                if tc["arguments"]:
                    try:
                        tool_input = json.loads(tc["arguments"])
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

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result_text,
                })

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
        if not uses_custom_key and total_input_tokens + total_output_tokens > 0:
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
