"""All Claude tool definitions + execution handlers."""
import asyncio
import logging
from datetime import datetime, timezone, date
from uuid import UUID

from app.core.config import get_settings
from app.services.vault_sync.owner import is_vault_owner
from app.services.vault_sync.writer import VaultWriteGuard
from app.services.rag import retriever

logger = logging.getLogger(__name__)

VAULT_UNAVAILABLE = "(Vault access is not available on this account.)"

"""
Area log folders. The FILE is per year and is resolved at call time by
`area_log_path()` — never stored here as a literal.

These were hardcoded to `2026.md` until 2026-08-03, which meant every append
from 2027-01-01 onward would have kept appending to the 2026 file. It would
not have raised: the path stayed on the write allowlist, so the write simply
landed in the wrong year, forever, silently.
"""
AREA_LOG_DIRS = {
    "finance": "01-finance",
    "health": "02-health",
    "career": "03-career",
    "business": "04-business",
    "content": "05-content",
}

# Not year-scoped — one rolling file.
SESSION_LOG_PATH = "memory/session-log.md"


def area_log_path(area: str | None, when: date | None = None) -> str:
    """Vault path for an area's log, for the year of `when` (default: today)."""
    folder = AREA_LOG_DIRS.get(area or "")
    if not folder:
        return SESSION_LOG_PATH
    year = (when or datetime.now(timezone.utc).date()).year
    return f"{folder}/log/{year}.md"

AREA_CONTEXT_MAP = {
    "finance": "01-finance/context.md",
    "health": "02-health/context.md",
    "career": "03-career/context.md",
    "business": "04-business/context.md",
    "content": "05-content/context.md",
    "master": "master.md",
}


def is_known_log_area(area: str | None) -> bool:
    """`session` is a valid target too — it is the one non-area log."""
    return area in AREA_LOG_DIRS or area == "session"


async def _sync_vault_path_if_enabled(settings, user_id: UUID, rel_path: str) -> None:
    if not settings.vault_sync_enabled:
        return
    try:
        from app.services.vault_sync.sync_engine import handle_file_change

        await handle_file_change(user_id, rel_path, "modified")
    except Exception as e:
        logger.warning("Vault sync update failed for %s: %s", rel_path, e)


async def _append_vault_entry(
    guard: VaultWriteGuard,
    settings,
    user_id: UUID,
    area: str | None,
    entry: str,
    affected: list[str],
) -> None:
    # The vault is one shared filesystem — only its owner's writes may land there.
    if not await is_vault_owner(user_id):
        return
    # Unknown/absent area falls back to the session log, as it always has.
    path = area_log_path(area)
    try:
        await asyncio.to_thread(guard.append_to_log, path, entry)
        if path not in affected:
            affected.append(path)
        await _sync_vault_path_if_enabled(settings, user_id, path)
    except Exception as e:
        logger.warning("Vault mirror failed for %s: %s", path, e)

_TOOL_SPECS = [
    {
        "name": "create_action",
        "description": "Create a new task/action in the workspace tasks list (Task model)",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title of the task/action"},
                "description": {"type": "string", "description": "Optional detailed description"},
                "domain": {"type": "string", "enum": ["finance", "health", "career", "business", "content", "general"], "description": "Associated life domain"},
                "status": {"type": "string", "enum": ["todo", "in_progress", "done"], "default": "todo"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "default": "medium"},
                "due_date": {"type": "string", "description": "Optional due date in YYYY-MM-DD format (e.g. 2026-07-08)"},
                "labels": {"type": "string", "description": "Optional comma-separated labels"},
                "project_id": {"type": "string", "description": "Optional project UUID"},
                "sprint_id": {"type": "string", "description": "Optional sprint UUID"},
                "goal_id": {"type": "string", "description": "Optional goal UUID"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "update_goal",
        "description": "Log progress or update status/details for an active macro goal in the database",
        "input_schema": {
            "type": "object",
            "properties": {
                "goal_id": {"type": "string", "description": "UUID of the goal"},
                "progress_score": {"type": "integer", "description": "Progress score from 0 to 100"},
                "ai_insight": {"type": "string", "description": "Optional AI insight on progress"},
                "status": {"type": "string", "enum": ["active", "completed", "archived"], "description": "Optional new status of the goal"},
                "title": {"type": "string", "description": "Optional new title for the goal"},
                "description": {"type": "string", "description": "Optional new description for the goal"},
            },
            "required": ["goal_id"],
        },
    },
    {
        "name": "log_transaction",
        "description": "Log a finance expense or income in the database and adjust the account balance",
        "input_schema": {
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "Transaction amount"},
                "type": {"type": "string", "enum": ["expense", "income"], "description": "Transaction type"},
                "description": {"type": "string", "description": "Description / details of the transaction"},
                "category": {"type": "string", "description": "Optional category name (e.g. food, salary)"},
                "category_id": {"type": "string", "description": "Optional category UUID"},
                "account_id": {"type": "string", "description": "Optional account UUID. If not provided, the default/first account will be used."},
                "tags": {"type": "string", "description": "Optional comma-separated tags"},
                "logged_at": {"type": "string", "description": "Optional ISO timestamp or date, defaults to current time"}
            },
            "required": ["amount", "type", "description"],
        },
    },
    {
        "name": "log_health_metric",
        "description": "Log a health metric (weight, sleep, steps, food, water) or a workout session with sets",
        "input_schema": {
            "type": "object",
            "properties": {
                "entry_type": {"type": "string", "description": "Type of health entry: 'workout' or a metric type (gym, weight, food, meal, water, steps, body_fat, sleep, note)"},
                "value": {"type": "number", "description": "Numeric value for the health metric (optional if workout)"},
                "unit": {"type": "string", "description": "Optional unit of measurement"},
                "notes": {"type": "string", "description": "Optional notes or comments"},
                "workout_name": {"type": "string", "description": "Name of the workout session if entry_type is 'workout' (e.g., Push Day)"},
                "workout_sets": {
                    "type": "array",
                    "description": "List of workout sets if entry_type is 'workout'",
                    "items": {
                        "type": "object",
                        "properties": {
                            "exercise": {"type": "string", "description": "Name of the exercise"},
                            "reps": {"type": "integer", "description": "Number of reps"},
                            "weight_kg": {"type": "number", "description": "Weight in kg (optional)"},
                            "set_number": {"type": "integer", "description": "Set number (optional)"}
                        },
                        "required": ["exercise", "reps"]
                    }
                },
                "logged_at": {"type": "string", "description": "Optional ISO timestamp or date, defaults to current time"}
            },
            "required": ["entry_type"],
        },
    },
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

_VAULT_TOOL_NAMES = {"read_context", "append_log", "update_context"}

# Two byte-stable variants so the tool block never varies within a cohort —
# a changing tool list would invalidate the provider-side prompt cache.
TOOLS_WITH_VAULT = _TOOL_SPECS
TOOLS_BASE = [t for t in _TOOL_SPECS if t["name"] not in _VAULT_TOOL_NAMES]


def tool_definitions_for(vault_enabled: bool) -> list[dict]:
    return TOOLS_WITH_VAULT if vault_enabled else TOOLS_BASE


# Tools that mutate user data and require explicit user confirmation before
# executing. The streaming agent yields a `tool_confirmation_required` event
# for these; the WS handler stores the pending call and resumes execution
# when the client sends `{"type": "tool_confirm", ...}`.
CONFIRM_TOOLS: frozenset[str] = frozenset({
    "log_transaction",
    "log_finance_transaction",
    "update_goal",
})

# Sentinel returned by execute_tool when a tool requires confirmation.
CONFIRMATION_PENDING = "__CONFIRMATION_PENDING__"


async def execute_tool(tool_name: str, tool_input: dict, user_id: UUID, confirmed: bool = False) -> tuple[str, list[str]]:
    """Returns (result_text, affected_paths).

    For tools in CONFIRM_TOOLS, returns (CONFIRMATION_PENDING, []) unless
    confirmed=True is passed (set by the WS handler after user approval).
    """
    if tool_name in CONFIRM_TOOLS and not confirmed:
        return CONFIRMATION_PENDING, []
    settings = get_settings()
    guard = VaultWriteGuard(settings.vault_path)
    affected: list[str] = []

    if tool_name == "read_context":
        if not await is_vault_owner(user_id):
            return VAULT_UNAVAILABLE, []
        area = tool_input["area"]
        path = AREA_CONTEXT_MAP.get(area, "master.md")
        content = await asyncio.to_thread(guard.read_file, path)
        return content or f"(context file not found: {path})", []

    elif tool_name == "append_log":
        if not await is_vault_owner(user_id):
            return VAULT_UNAVAILABLE, []
        area = tool_input["area"]
        entry = tool_input["entry"]
        if not is_known_log_area(area):
            return f"Unknown area: {area}", []
        path = area_log_path(area)
        await asyncio.to_thread(guard.append_to_log, path, entry)
        affected.append(path)
        await _sync_vault_path_if_enabled(settings, user_id, path)
        return f"Logged to {path}", affected

    elif tool_name == "update_context":
        if not await is_vault_owner(user_id):
            return VAULT_UNAVAILABLE, []
        area = tool_input["area"]
        updates: dict = tool_input["updates"]
        path = AREA_CONTEXT_MAP.get(area)
        if not path:
            return f"Unknown area: {area}", []

        current = await asyncio.to_thread(guard.read_file, path) or ""
        import re
        updated = current
        for key, value in updates.items():
            pattern = re.compile(rf"^({re.escape(key)}\s*:\s*)(.+)$", re.MULTILINE | re.IGNORECASE)
            if pattern.search(updated):
                val_str = str(value)
                updated = pattern.sub(lambda m, v=val_str: m.group(1) + v, updated)
            else:
                updated += f"\n{key}: {value}"

        await asyncio.to_thread(guard.update_context, path, updated)
        affected.append(path)
        await _sync_vault_path_if_enabled(settings, user_id, path)
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
        return f"Calendar events ({len(events)} total):\n<external_data>\n" + "\n".join(lines) + "\n</external_data>", []

    elif tool_name == "get_notion_page":
        from app.services.integrations.notion import get_page_by_title
        try:
            text = await get_page_by_title(user_id, tool_input["title"])
        except Exception as e:
            logger.warning("get_notion_page failed: %s", e)
            return "(Notion request failed — try again or re-connect Notion.)", []
        return f"<external_data>\n{text[:6000]}\n</external_data>", []

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
        return f"Recent emails ({len(emails)}):\n<external_data>\n" + "\n".join(lines) + "\n</external_data>", []

    elif tool_name == "create_action":
        from app.models.workspace import Task
        from app.db.session import AsyncSessionLocal

        # Map legacy fields to new fields
        title = tool_input.get("title") or tool_input.get("action_type")
        if not title:
            return "Error: title or action_type is required.", []

        description = tool_input.get("description") or tool_input.get("ai_explanation")
        domain = tool_input.get("domain") or tool_input.get("source_domain") or "general"
        status = tool_input.get("status") or "todo"
        priority = tool_input.get("priority") or "medium"

        due_date_val = None
        due_date_str = tool_input.get("due_date")
        if due_date_str:
            try:
                due_date_val = date.fromisoformat(due_date_str.split("T")[0])
            except Exception:
                pass

        project_id = None
        if tool_input.get("project_id"):
            try:
                project_id = UUID(str(tool_input["project_id"]))
            except ValueError:
                return "Error: Invalid project_id UUID format.", []

        sprint_id = None
        if tool_input.get("sprint_id"):
            try:
                sprint_id = UUID(str(tool_input["sprint_id"]))
            except ValueError:
                return "Error: Invalid sprint_id UUID format.", []

        goal_id = None
        if tool_input.get("goal_id"):
            try:
                goal_id = UUID(str(tool_input["goal_id"]))
            except ValueError:
                return "Error: Invalid goal_id UUID format.", []

        task = Task(
            user_id=user_id,
            project_id=project_id,
            sprint_id=sprint_id,
            goal_id=goal_id,
            title=title,
            description=description,
            domain=domain,
            status=status,
            priority=priority,
            due_date=due_date_val,
            labels=tool_input.get("labels")
        )

        try:
            async with AsyncSessionLocal() as db:
                db.add(task)
                await db.commit()
                await db.refresh(task)
        except Exception as e:
            logger.error("Database commit failed for create_action: %s", e)
            return "Error: Database transaction failed. Please try again.", []

        await _append_vault_entry(
            guard,
            settings,
            user_id,
            task.domain,
            f"Task created: {task.title}"
            + (f" — {task.description}" if task.description else "")
            + (f" (status: {task.status}, priority: {task.priority})" if task.status or task.priority else ""),
            affected,
        )

        return f"Created task: '{task.title}' (ID: {task.id}) in domain {task.domain}", affected

    elif tool_name == "update_goal":
        from app.models.goal import MacroGoal, GoalProgress
        from app.db.session import AsyncSessionLocal
        from sqlmodel import select

        try:
            goal_id = UUID(str(tool_input["goal_id"]))
        except ValueError:
            return "Error: Invalid goal_id UUID format.", []

        progress_score = tool_input.get("progress_score")
        ai_insight = tool_input.get("ai_insight")
        status = tool_input.get("status")
        title = tool_input.get("title")
        description = tool_input.get("description")

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(MacroGoal).where(MacroGoal.id == goal_id, MacroGoal.user_id == user_id)
            )
            goal = result.scalar_one_or_none()
            if not goal:
                return f"Error: Goal with ID {goal_id} not found.", []

            if title is not None:
                goal.title = title
            if description is not None:
                goal.description = description
            if status is not None:
                goal.status = status

            if progress_score == 100:
                goal.status = "completed"

            goal.updated_at = datetime.utcnow()
            db.add(goal)

            if progress_score is not None:
                progress = GoalProgress(
                    user_id=user_id,
                    goal_id=goal_id,
                    progress_score=progress_score,
                    ai_insight=ai_insight
                )
                db.add(progress)
                msg = f"Updated goal '{goal.title}' progress to {progress_score}% and logged progress entry"
            else:
                msg = f"Updated goal '{goal.title}' fields"

            try:
                await db.commit()
            except Exception as e:
                logger.error("Database commit failed for update_goal: %s", e)
                return "Error: Failed to update goal in the database.", []

        await _append_vault_entry(
            guard,
            settings,
            user_id,
            goal.category,
            f"Goal updated: {goal.title}"
            + (f" — progress {progress_score}%" if progress_score is not None else "")
            + (f" — status {goal.status}" if goal.status else "")
            + (f" — {ai_insight}" if ai_insight else ""),
            affected,
        )

        return msg, affected

    elif tool_name in ("log_transaction", "log_finance_transaction"):
        from app.db.session import AsyncSessionLocal
        from decimal import Decimal
        from sqlmodel import select
        from app.models.finance import Account, AccountType

        try:
            amount = Decimal(str(tool_input["amount"]))
        except (ValueError, TypeError):
            return "Error: Invalid amount format.", []

        if amount <= 0:
            return "Error: Transaction amount must be positive.", []

        tx_type = tool_input["type"]
        description = tool_input["description"]
        category = tool_input.get("category")
        category_id_str = tool_input.get("category_id")
        try:
            category_id = UUID(str(category_id_str)) if category_id_str else None
        except ValueError:
            return "Error: Invalid category_id UUID format.", []
        tags = tool_input.get("tags")

        logged_at_val = datetime.utcnow()
        logged_at_str = tool_input.get("logged_at")
        if logged_at_str:
            try:
                logged_at_val = datetime.fromisoformat(logged_at_str.replace("Z", "+00:00"))
            except Exception:
                pass
        if logged_at_val.tzinfo is not None:
            logged_at_val = logged_at_val.astimezone(timezone.utc).replace(tzinfo=None)

        account_id_str = tool_input.get("account_id")
        try:
            account_id = UUID(str(account_id_str)) if account_id_str else None
        except ValueError:
            return "Error: Invalid account_id UUID format.", []

        async with AsyncSessionLocal() as db:
            # Resolve account
            if not account_id:
                result = await db.execute(select(Account).where(Account.user_id == user_id))
                accounts = result.scalars().all()
                if accounts:
                    account_id = accounts[0].id
                else:
                    # Create default Checking account if none exists
                    default_account = Account(
                        user_id=user_id,
                        name="Checking",
                        type=AccountType.CHECKING,
                        balance=Decimal("0.00"),
                        currency="INR"
                    )
                    db.add(default_account)
                    await db.flush()
                    account_id = default_account.id

            # Adjust account balance using SELECT ... WITH_FOR_UPDATE
            result = await db.execute(
                select(Account).where(Account.id == account_id, Account.user_id == user_id).with_for_update()
            )
            account = result.scalar_one_or_none()
            if not account:
                return f"Error: Account with ID {account_id} not found.", []

            delta = -amount if tx_type == "expense" else amount
            account.balance = account.balance + delta
            db.add(account)

            # Create transaction
            if tx_type == "expense":
                from app.models.finance import FinanceExpense
                tx = FinanceExpense(
                    user_id=user_id,
                    amount=amount,
                    description=description,
                    category=category,
                    category_id=category_id,
                    account_id=account_id,
                    tags=tags,
                    logged_at=logged_at_val,
                    source="agent"
                )
            else:
                from app.models.finance import FinanceIncome
                tx = FinanceIncome(
                    user_id=user_id,
                    amount=amount,
                    source=category or description,
                    category_id=category_id,
                    account_id=account_id,
                    tags=tags,
                    description=description,
                    logged_at=logged_at_val
                )

            db.add(tx)
            try:
                await db.commit()
            except Exception as e:
                logger.error("Database commit failed for log_transaction: %s", e)
                return "Error: Failed to log transaction in the database.", []

        await _append_vault_entry(
            guard,
            settings,
            user_id,
            "finance",
            f"{tx_type.title()} logged: {amount} {account.currency} for {description}"
            + (f" [{category}]" if category else "")
            + f" via {account.name}",
            affected,
        )

        return f"Logged finance {tx_type}: {amount} under account '{account.name}'", affected

    elif tool_name == "log_health_metric":
        from app.db.session import AsyncSessionLocal
        from decimal import Decimal

        entry_type = tool_input["entry_type"]
        logged_at_val = datetime.utcnow()
        logged_at_str = tool_input.get("logged_at")
        if logged_at_str:
            try:
                logged_at_val = datetime.fromisoformat(logged_at_str.replace("Z", "+00:00"))
            except Exception:
                pass
        if logged_at_val.tzinfo is not None:
            logged_at_val = logged_at_val.astimezone(timezone.utc).replace(tzinfo=None)

        async with AsyncSessionLocal() as db:
            if entry_type == "workout" or "workout_sets" in tool_input:
                from app.models.health import WorkoutSession, WorkoutSet

                # Validate sets, reps, and weights in workout_sets
                workout_sets = tool_input.get("workout_sets") or []
                for idx, set_info in enumerate(workout_sets):
                    exercise = set_info.get("exercise")
                    reps = set_info.get("reps")
                    if not exercise or reps is None:
                        continue
                    
                    try:
                        reps_val = int(reps)
                    except (ValueError, TypeError):
                        return "Error: Reps must be an integer.", []
                    if reps_val <= 0:
                        return "Error: Reps must be positive.", []

                    set_num = set_info.get("set_number")
                    if set_num is not None:
                        try:
                            set_num_val = int(set_num)
                        except (ValueError, TypeError):
                            return "Error: Set number must be an integer.", []
                        if set_num_val <= 0:
                            return "Error: Set number must be positive.", []

                    weight_kg_val = None
                    if "weight_kg" in set_info and set_info["weight_kg"] is not None:
                        try:
                            weight_kg_val = Decimal(str(set_info["weight_kg"]))
                        except (ValueError, TypeError):
                            return "Error: Invalid weight format.", []
                        if weight_kg_val < 0:
                            return "Error: Weight must be positive or zero.", []

                session = WorkoutSession(
                    user_id=user_id,
                    name=tool_input.get("workout_name") or "Workout",
                    logged_at=logged_at_val,
                    notes=tool_input.get("notes")
                )
                db.add(session)
                await db.flush()

                sets_logged = 0
                for idx, set_info in enumerate(workout_sets):
                    exercise = set_info.get("exercise")
                    reps = set_info.get("reps")
                    if not exercise or reps is None:
                        continue
                    weight_kg = None
                    if "weight_kg" in set_info and set_info["weight_kg"] is not None:
                        weight_kg = Decimal(str(set_info["weight_kg"]))

                    w_set = WorkoutSet(
                        user_id=user_id,
                        session_id=session.id,
                        exercise=exercise,
                        set_number=set_info.get("set_number") or (idx + 1),
                        reps=reps,
                        weight_kg=weight_kg
                    )
                    db.add(w_set)
                    sets_logged += 1

                try:
                    await db.commit()
                except Exception as e:
                    logger.error("Database commit failed for workout session: %s", e)
                    return "Error: Failed to save workout session to the database.", []
                await _append_vault_entry(
                    guard,
                    settings,
                    user_id,
                    "health",
                    f"Workout logged: {session.name} with {sets_logged} sets"
                    + (f" — {session.notes}" if session.notes else ""),
                    affected,
                )
                return f"Logged workout session '{session.name}' with {sets_logged} sets.", affected

            else:
                from app.models.health import HealthLog

                allowed_types = {"gym", "weight", "food", "meal", "water", "steps", "body_fat", "sleep", "note"}
                if entry_type not in allowed_types:
                    return f"Error: Invalid entry_type '{entry_type}'. Must be one of: {', '.join(allowed_types)}", []

                # Enforce positive values for health metrics (except note/gym maybe, but weight/steps/sleep should be positive)
                val_input = tool_input.get("value")
                val_decimal = None
                if val_input is not None:
                    try:
                        val_decimal = Decimal(str(val_input))
                    except (ValueError, TypeError):
                        return "Error: Invalid health metric value format.", []
                    
                    if entry_type == "weight" and val_decimal <= 0:
                        return "Error: Weight value must be positive.", []
                    elif entry_type in ("steps", "sleep", "water", "body_fat") and val_decimal <= 0:
                        return f"Error: Health metric {entry_type} must be positive.", []

                log = HealthLog(
                    user_id=user_id,
                    entry_type=entry_type,
                    value=val_decimal,
                    unit=tool_input.get("unit"),
                    notes=tool_input.get("notes"),
                    logged_at=logged_at_val,
                    source="agent"
                )
                db.add(log)
                try:
                    await db.commit()
                except Exception as e:
                    logger.error("Database commit failed for health log: %s", e)
                    return "Error: Failed to save health metric to the database.", []
                await _append_vault_entry(
                    guard,
                    settings,
                    user_id,
                    "health",
                    f"Health metric logged: {log.entry_type} = {log.value or '—'} {log.unit or ''}".strip()
                    + (f" — {log.notes}" if log.notes else ""),
                    affected,
                )
                return f"Logged health metric: {log.entry_type} = {log.value} {log.unit or ''}", affected

    return f"Unknown tool: {tool_name}", []
