import json
import logging
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


async def chat_ws_handler(websocket: WebSocket, user_id: str) -> None:
    await websocket.accept()

    # Per-connection sliding-window rate limit (a connection is per-user).
    per_min = get_settings().rate_limit_chat_per_min
    message_times: deque[float] = deque()

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            logger.info(f"WS Payload: {data}")


            if data.get("type") != "message":
                continue

            now = time.monotonic()
            while message_times and message_times[0] < now - 60:
                message_times.popleft()
            if len(message_times) >= per_min:
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
                async with AsyncSessionLocal() as session:
                    # Title from the first message — free, keeps history scannable.
                    new_session = ChatSession(user_id=user_id, title=user_content.strip()[:60] or None)
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

            history = [
                {"role": m.role, "content": m.content}
                for m in history_rows
                if m.role in ("user", "assistant")
            ]

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
            finally:
                if full_response:
                    async with AsyncSessionLocal() as session:
                        session.add(ChatMessage(
                            user_id=user_id,
                            session_id=session_id,
                            role="assistant",
                            content=full_response,
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
