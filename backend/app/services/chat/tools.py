"""All Claude tool definitions + execution handlers."""
import logging
from datetime import datetime, timezone

from app.core.config import get_settings
from app.services.vault_sync.writer import VaultWriteGuard
from app.services.rag import retriever

logger = logging.getLogger(__name__)

AREA_LOG_MAP = {
    "finance": "01-finance/log/2026.md",
    "health": "02-health/log/2026.md",
    "career": "03-career/log/2026.md",
    "business": "04-business/log/2026.md",
    "content": "05-content/log/2026.md",
    "session": "memory/session-log.md",
}

AREA_CONTEXT_MAP = {
    "finance": "01-finance/context.md",
    "health": "02-health/context.md",
    "career": "03-career/context.md",
    "business": "04-business/context.md",
    "content": "05-content/context.md",
    "master": "master.md",
}

TOOL_DEFINITIONS = [
    {
        "name": "read_context",
        "description": "Read the current context file for a life area",
        "input_schema": {
            "type": "object",
            "properties": {
                "area": {
                    "type": "string",
                    "enum": ["finance", "health", "career", "business", "content", "master"],
                }
            },
            "required": ["area"],
        },
    },
    {
        "name": "append_log",
        "description": "Append a timestamped entry to a life area's log file. Use for any real-world update (gym done, expense logged, learning noted, etc.)",
        "input_schema": {
            "type": "object",
            "properties": {
                "area": {
                    "type": "string",
                    "enum": ["finance", "health", "career", "business", "content", "session"],
                },
                "entry": {
                    "type": "string",
                    "description": "The log entry text. Will be prefixed with current datetime.",
                },
            },
            "required": ["area", "entry"],
        },
    },
    {
        "name": "update_context",
        "description": "Update specific fields in a life area's context.md. Only call when a number or status genuinely changed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "area": {
                    "type": "string",
                    "enum": ["finance", "health", "career", "business", "content"],
                },
                "updates": {
                    "type": "object",
                    "description": "Key-value pairs of fields to update in the context file",
                },
            },
            "required": ["area", "updates"],
        },
    },
    {
        "name": "search_vault",
        "description": "Semantic search over all vault files to find relevant context",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "top_k": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_calendar_events",
        "description": "Get Google Calendar events for a date range",
        "input_schema": {
            "type": "object",
            "properties": {
                "date_from": {"type": "string", "format": "date"},
                "date_to": {"type": "string", "format": "date"},
            },
            "required": ["date_from", "date_to"],
        },
    },
    {
        "name": "get_github_activity",
        "description": "Get recent GitHub commits and activity for tracked repos",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "default": 7},
            },
        },
    },
    {
        "name": "get_notion_page",
        "description": "Read a Notion page by title. Returns the page content if the Notion integration is connected.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title of the Notion page to retrieve"},
            },
            "required": ["title"],
        },
    },
]


async def execute_tool(tool_name: str, tool_input: dict) -> tuple[str, list[str]]:
    """Returns (result_text, affected_paths)."""
    settings = get_settings()
    guard = VaultWriteGuard(settings.vault_path)
    affected: list[str] = []

    if tool_name == "read_context":
        area = tool_input["area"]
        path = AREA_CONTEXT_MAP.get(area, "master.md")
        content = guard.read_file(path)
        return content or f"(context file not found: {path})", []

    elif tool_name == "append_log":
        area = tool_input["area"]
        entry = tool_input["entry"]
        path = AREA_LOG_MAP.get(area)
        if not path:
            return f"Unknown area: {area}", []
        guard.append_to_log(path, entry)
        affected.append(path)
        return f"Logged to {path}", affected

    elif tool_name == "update_context":
        area = tool_input["area"]
        updates: dict = tool_input["updates"]
        path = AREA_CONTEXT_MAP.get(area)
        if not path:
            return f"Unknown area: {area}", []

        current = guard.read_file(path) or ""
        import re
        updated = current
        for key, value in updates.items():
            pattern = re.compile(rf"^({re.escape(key)}\s*:\s*)(.+)$", re.MULTILINE | re.IGNORECASE)
            if pattern.search(updated):
                updated = pattern.sub(rf"\g<1>{value}", updated)
            else:
                updated += f"\n{key}: {value}"

        guard.update_context(path, updated)
        affected.append(path)
        return f"Updated {path}: {list(updates.keys())}", affected

    elif tool_name == "search_vault":
        query = tool_input["query"]
        top_k = tool_input.get("top_k", 5)
        results = await retriever.search(query, top_k=top_k)
        if not results:
            return "No relevant vault content found.", []
        lines = [f"[{r['path']} | similarity {r['similarity']:.2f}]\n{r['content'][:400]}" for r in results]
        return "\n\n---\n".join(lines), []

    elif tool_name == "get_calendar_events":
        # Requires GCal integration — return placeholder if not connected
        return "(Google Calendar integration not connected)", []

    elif tool_name == "get_github_activity":
        return "(GitHub integration not connected)", []

    elif tool_name == "get_notion_page":
        return "(Notion integration not connected. Connect Notion in the Integrations page to enable this.)", []

    return f"Unknown tool: {tool_name}", []
