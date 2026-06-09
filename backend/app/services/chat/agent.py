"""Claude API streaming caller + tool loop."""
import json
import logging
from typing import AsyncGenerator
from uuid import UUID

import anthropic

from app.core.config import get_settings
from app.services.chat.context_builder import build_system_prompt
from app.services.chat.memory import check_budget, record_usage, get_token_budget_status
from app.services.chat.tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 8


async def stream_chat_response(
    session_id: UUID,
    user_message: str,
    history: list[dict],
) -> AsyncGenerator[dict, None]:
    settings = get_settings()

    # Check budget before calling Claude
    try:
        await check_budget(session_id, estimated_input=2000)
    except Exception as e:
        yield {"type": "error", "code": "token_budget_exceeded", "message": str(e)}
        return

    budget_status = await get_token_budget_status()
    tokens_remaining = budget_status["daily_limit"] - budget_status["used_today"]

    system_prompt = await build_system_prompt(user_message, tokens_remaining)

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    messages = history + [{"role": "user", "content": user_message}]

    total_input_tokens = 0
    total_output_tokens = 0
    affected_paths: list[str] = []

    for iteration in range(MAX_TOOL_ITERATIONS):
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
                    if event.content_block.type == "text":
                        pass
                    elif event.content_block.type == "tool_use":
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

                elif event.type == "message_delta":
                    total_output_tokens += event.usage.output_tokens if hasattr(event, "usage") else 0

            final_message = await stream.get_final_message()
            total_input_tokens += final_message.usage.input_tokens
            total_output_tokens = final_message.usage.output_tokens
            stop_reason = final_message.stop_reason

        if not tool_calls_in_turn or stop_reason != "tool_use":
            break

        # Execute tools
        tool_results = []
        for tc in tool_calls_in_turn:
            tool_input = {}
            if tc["input_buffer"]:
                try:
                    tool_input = json.loads(tc["input_buffer"])
                except json.JSONDecodeError:
                    pass

            yield {"type": "tool_call", "tool": tc["name"], "input": tool_input}

            result_text, paths = await execute_tool(tc["name"], tool_input)
            affected_paths.extend(paths)

            yield {
                "type": "tool_result",
                "tool": tc["name"],
                "status": "ok",
                "result": result_text,
                "affected": paths,
            }

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tc["id"],
                "content": result_text,
            })

        # Rebuild messages for next iteration
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

    # Record token usage
    await record_usage(session_id, total_input_tokens, total_output_tokens)

    updated_budget = await get_token_budget_status()
    yield {
        "type": "done",
        "tokens": {
            "input": total_input_tokens,
            "output": total_output_tokens,
            "daily_remaining": updated_budget["daily_limit"] - updated_budget["used_today"],
        },
        "affected_paths": affected_paths,
    }
