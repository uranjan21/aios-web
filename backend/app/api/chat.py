import json
import logging
import re
import time
import uuid
from collections import deque

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from sqlmodel import select, desc

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.llm_models import allowed_models, validate_model, validate_provider
from app.core.rate_limit import limiter
from app.db.session import AsyncSessionLocal
from app.models.chat import ChatSession, ChatMessage
from app.models.user import User
from app.services.billing.usage import ai_allowed
from app.services.chat.agent import stream_chat_response
from app.services.chat.memory import get_token_budget_status

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)


@router.get("/models")
async def list_models(current_user=Depends(get_current_user)):
    """Allowlisted chat models — single source for every frontend model menu."""
    settings = get_settings()
    return {
        "providers": allowed_models(),
        "default_provider": settings.llm_provider,
        "defaults": {
            "openai": settings.openai_chat_model,
            "anthropic": settings.claude_model,
        },
    }


@router.get("/sessions")
async def list_sessions(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .where(ChatSession.is_archived == False)
        .order_by(desc(ChatSession.last_message_at))
        .limit(50)
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}")
async def get_session(session_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    session_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id, ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at)
        .limit(100)
    )
    messages = messages_result.scalars().all()
    return {"session": session, "messages": messages}


@router.delete("/sessions/{session_id}")
@limiter.limit("10/minute")
async def delete_session(request: Request, session_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages_result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.session_id == session_id,
            ChatMessage.user_id == current_user.id,
        )
    )
    for msg in messages_result.scalars().all():
        await db.delete(msg)
        
    await db.delete(session)
    await db.commit()
    return {"status": "deleted"}


from pydantic import BaseModel
class ChatSessionPatch(BaseModel):
    title: str | None = None
    is_archived: bool | None = None

@router.patch("/sessions/{session_id}")
async def patch_session(session_id: uuid.UUID, body: ChatSessionPatch, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if body.title is not None:
        session.title = body.title
    if body.is_archived is not None:
        session.is_archived = body.is_archived
        
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/token-budget")
async def token_budget(current_user=Depends(get_current_user)):
    return await get_token_budget_status(current_user.id)


async def _ws_rate_limit_check(user_id: str, per_min: int, settings) -> bool:
    """Shared sliding-window rate limit keyed by user_id across all WS connections.

    Uses Redis ZADD/ZCOUNT when REDIS_URL is configured so multi-tab sessions
    share the same bucket. Falls back to always-allow in dev (per-connection
    deque below is the fallback safety net).
    """
    if not settings.redis_url:
        return True
    try:
        import redis.asyncio as aioredis
        key = f"ws_rate:{user_id}"
        now = time.time()
        window_start = now - 60.0
        async with aioredis.from_url(settings.redis_url, decode_responses=True) as r:
            pipe = r.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            _, count = await pipe.execute()
            if count >= per_min:
                return False
            await r.zadd(key, {str(now): now})
            await r.expire(key, 90)
        return True
    except Exception:
        logger.warning("Redis WS rate-limit check failed — allowing message", exc_info=True)
        return True


async def _pending_tool_set(
    call_id: str, user_id: str, payload: dict, settings, local: dict
) -> None:
    """Store a pending tool call; Redis-backed in prod, in-process dict in dev."""
    if settings.redis_url:
        try:
            import redis.asyncio as aioredis
            key = f"pending_tool:{user_id}:{call_id}"
            async with aioredis.from_url(settings.redis_url, decode_responses=True) as r:
                await r.set(key, json.dumps(payload), ex=300)
            return
        except Exception:
            logger.warning("Redis pending-tool set failed, falling back to local dict", exc_info=True)
    local[call_id] = payload


async def _pending_tool_pop(
    call_id: str, user_id: str, settings, local: dict
) -> dict | None:
    """Retrieve and delete a pending tool call; Redis-backed in prod, in-process dict in dev."""
    if settings.redis_url:
        try:
            import redis.asyncio as aioredis
            key = f"pending_tool:{user_id}:{call_id}"
            async with aioredis.from_url(settings.redis_url, decode_responses=True) as r:
                raw = await r.getdel(key)
            if raw is not None:
                return json.loads(raw)
            # Not in Redis — also check local (covers the fallback-write case)
        except Exception:
            logger.warning("Redis pending-tool pop failed, falling back to local dict", exc_info=True)
    return local.pop(call_id, None)


async def chat_ws_handler(websocket: WebSocket, user_id: str) -> None:
    await websocket.accept()

    settings = get_settings()
    per_min = settings.rate_limit_chat_per_min
    # Per-connection fallback for dev (no Redis): sliding deque.
    message_times: deque[float] = deque()

    # Pending tool calls awaiting user confirmation keyed by tool_call_id.
    # Populated when the agent yields tool_confirmation_required; consumed when
    # the client sends tool_confirm or tool_cancel.
    pending_tool_calls: dict[str, dict] = {}

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            logger.debug("WS msg type=%s session=%s", data.get("type"), data.get("session_id"))

            msg_type = data.get("type")

            # ── Tool confirmation / cancellation ───────────────────────────
            if msg_type == "tool_confirm":
                call_id = data.get("tool_call_id")
                pending = await _pending_tool_pop(call_id, str(user_id), settings, pending_tool_calls) if call_id else None
                if pending is None:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "No pending tool call with that ID.",
                    }))
                    continue
                from app.services.chat.tools import execute_tool
                from app.models.user import User as _User
                from sqlalchemy.future import select as _select
                try:
                    result_text, paths = await execute_tool(
                        pending["tool"], pending["params"], user_id, confirmed=True
                    )
                    await websocket.send_text(json.dumps({
                        "type": "tool_confirmed_result",
                        "tool": pending["tool"],
                        "tool_call_id": call_id,
                        "status": "ok",
                        "result": result_text,
                        "affected": paths,
                    }))
                except Exception as exc:
                    logger.error("Confirmed tool %s failed: %s", pending["tool"], exc)
                    await websocket.send_text(json.dumps({
                        "type": "tool_confirmed_result",
                        "tool": pending["tool"],
                        "tool_call_id": call_id,
                        "status": "error",
                        "result": "Tool execution failed after confirmation.",
                    }))
                continue

            if msg_type == "tool_cancel":
                call_id = data.get("tool_call_id")
                await _pending_tool_pop(call_id, str(user_id), settings, pending_tool_calls)
                await websocket.send_text(json.dumps({
                    "type": "tool_cancelled",
                    "tool_call_id": call_id,
                }))
                continue

            if msg_type != "message":
                continue

            # Per-user rate limit (Redis-backed in production, deque fallback in dev).
            if not await _ws_rate_limit_check(user_id, per_min, settings):
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "code": "rate_limited",
                    "message": "Too many messages — wait a moment and try again.",
                }))
                continue

            # Dev/no-Redis fallback: per-connection sliding window.
            now = time.monotonic()
            while message_times and message_times[0] < now - 60:
                message_times.popleft()
            if not settings.redis_url and len(message_times) >= per_min:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "code": "rate_limited",
                    "message": "Too many messages — wait a moment and try again.",
                }))
                continue
            message_times.append(now)

            user_content = data.get("content", "")
            session_id_str = data.get("session_id")
            # Never trust raw model strings on the operator's key.
            provider = validate_provider(data.get("provider"))
            model = validate_model(provider, data.get("model"))
            attachments = data.get("attachments")

            async with AsyncSessionLocal() as session:
                user_result = await session.execute(select(User).where(User.id == user_id))
                current_user = user_result.scalar_one_or_none()
                if current_user is None or not await ai_allowed(session, current_user):
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "code": "ai_quota_exceeded",
                        "message": "Monthly AI quota exceeded. Upgrade or add the chat module to continue.",
                    }))
                    continue

            if not session_id_str:
                # Title from the first message — free, keeps history scannable.
                # Strip the frontend's hidden [System: ...] context lines first.
                visible = re.sub(r"^(\s*\[System:[^\]]*\]\s*)+", "", user_content).strip()
                async with AsyncSessionLocal() as session:
                    new_session = ChatSession(user_id=user_id, title=visible[:60] or None)
                    session.add(new_session)
                    await session.commit()
                    await session.refresh(new_session)
                    session_id = new_session.id
                # Tell the client, or its next message creates ANOTHER session.
                await websocket.send_text(json.dumps({
                    "type": "session_created",
                    "session_id": str(session_id),
                }))
            else:
                try:
                    session_id = uuid.UUID(session_id_str)
                except ValueError:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Invalid session ID"}))
                    continue

                # Verify the session belongs to this user before reading/writing it.
                async with AsyncSessionLocal() as session:
                    owned = await session.execute(
                        select(ChatSession.id).where(
                            ChatSession.id == session_id, ChatSession.user_id == user_id
                        )
                    )
                    if owned.scalar_one_or_none() is None:
                        await websocket.send_text(json.dumps({"type": "error", "message": "Session not found"}))
                        continue

            # Load newest 20 messages in chronological order
            async with AsyncSessionLocal() as session:
                history_result = await session.execute(
                    select(ChatMessage)
                    .where(ChatMessage.session_id == session_id, ChatMessage.user_id == user_id)
                    .order_by(desc(ChatMessage.created_at))
                    .limit(20)
                )
                history_rows = list(reversed(history_result.scalars().all()))

            history = []
            for m in history_rows:
                if m.role == "user":
                    history.append({"role": "user", "content": m.content})
                elif m.role == "assistant":
                    entry: dict = {"role": "assistant", "content": m.content}
                    if provider == "openai" and m.tool_calls:
                        entry["tool_calls"] = [
                            {
                                "id": tc["id"],
                                "type": "function",
                                "function": {
                                    "name": tc["name"],
                                    "arguments": tc.get("arguments", "{}"),
                                },
                            }
                            for tc in m.tool_calls
                        ]
                    history.append(entry)
                    if provider == "openai" and m.tool_results:
                        for tr in m.tool_results:
                            history.append({
                                "role": "tool",
                                "tool_call_id": tr["call_id"],
                                "content": tr["result"],
                            })

            async with AsyncSessionLocal() as session:
                session.add(ChatMessage(
                    user_id=user_id,
                    session_id=session_id,
                    role="user",
                    content=user_content,
                ))
                await session.commit()

            # Always persist partial response — save in finally so disconnect doesn't lose it
            full_response = ""
            # Accumulated tool call/result pairs for this turn (OpenAI-canonical format).
            turn_tool_calls: list[dict] = []
            turn_tool_results: list[dict] = []
            try:
                async for event in stream_chat_response(
                    current_user.id,
                    session_id,
                    user_content,
                    history,
                    model=model,
                    provider=provider,
                    attachments=attachments,
                ):
                    await websocket.send_text(json.dumps(event))
                    if event.get("type") == "chunk":
                        full_response += event.get("content", "")
                    elif event.get("type") == "tool_call" and event.get("call_id"):
                        turn_tool_calls.append({
                            "id": event["call_id"],
                            "name": event["tool"],
                            "arguments": json.dumps(event.get("input", {})),
                        })
                    elif event.get("type") == "tool_result" and event.get("call_id"):
                        turn_tool_results.append({
                            "call_id": event["call_id"],
                            "result": event.get("result", ""),
                        })
                    elif event.get("type") == "tool_confirmation_required":
                        call_id = event.get("tool_call_id")
                        if call_id:
                            await _pending_tool_set(
                                call_id, str(user_id),
                                {"tool": event["tool"], "params": event["params"]},
                                settings, pending_tool_calls,
                            )
            finally:
                if full_response:
                    async with AsyncSessionLocal() as session:
                        session.add(ChatMessage(
                            user_id=user_id,
                            session_id=session_id,
                            role="assistant",
                            content=full_response,
                            tool_calls=turn_tool_calls or None,
                            tool_results=turn_tool_results or None,
                        ))
                        await session.commit()
                    # Meter one AI action per completed response (Phase 2).
                    from app.services.billing.usage import record_ai_usage
                    async with AsyncSessionLocal() as session:
                        await record_ai_usage(session, user_id, units=1, source="chat")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("Chat WebSocket error: %s", e)
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": "Internal server error"}))
        except Exception:
            pass
