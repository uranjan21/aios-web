"""All Claude tool definitions + execution handlers."""
import logging
from datetime import datetime, timezone
from uuid import UUID

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
    {
        "name": "get_recent_emails",
        "description": "Get recent Gmail inbox highlights (subject, sender, snippet). Read-only; requires the Gmail integration.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 10},
                "unread_only": {"type": "boolean", "default": False},
            },
        },
    },
]


async def execute_tool(tool_name: str, tool_input: dict, user_id: UUID) -> tuple[str, list[str]]:
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
        results = await retriever.search(query, top_k=top_k, user_id=user_id)
        if not results:
            return "No relevant vault content found.", []
        lines = [f"[{r['path']} | similarity {r['similarity']:.2f}]\n{r['content'][:400]}" for r in results]
        return "\n\n---\n".join(lines), []

    elif tool_name == "get_calendar_events":
        from app.services.integrations.google_calendar import get_stored_events
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            events = await get_stored_events(
                user_id,
                db,
                date_from=tool_input.get("date_from"),
                date_to=tool_input.get("date_to"),
            )
        if not events:
            return "(No calendar events found — is Google Calendar connected?)", []
        lines = [f"• {e['start_time'][:16]} — {e['title']}" for e in events[:20]]
        return f"Calendar events ({len(events)} total):\n" + "\n".join(lines), []

    elif tool_name == "get_github_activity":
        return "(GitHub integration not connected)", []

    elif tool_name == "get_notion_page":
        from app.services.integrations.notion import get_page_by_title
        try:
            text = await get_page_by_title(user_id, tool_input["title"])
        except Exception as e:
            logger.warning("get_notion_page failed: %s", e)
            return "(Notion request failed — try again or re-connect Notion.)", []
        return text[:6000], []

    elif tool_name == "get_recent_emails":
        from app.services.integrations.gmail import get_stored_messages
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            emails = await get_stored_messages(
                user_id, db,
                limit=tool_input.get("limit", 10),
                unread_only=tool_input.get("unread_only", False),
            )
        if not emails:
            return "(No emails found — is Gmail connected and synced?)", []
        lines = [
            f"• [{(e['received_at'] or '')[:16]}] {'(unread) ' if e['is_unread'] else ''}{e['sender']} — {e['subject']}\n  {(e['snippet'] or '')[:150]}"
            for e in emails
        ]
        return f"Recent emails ({len(emails)}):\n" + "\n".join(lines), []

    return f"Unknown tool: {tool_name}", []
