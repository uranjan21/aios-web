import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.db.session import AsyncSessionLocal
from app.models.chat import ChatSession, ChatMessage
from app.services.chat.agent import stream_chat_response
from app.services.chat.memory import get_token_budget_status

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)


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
async def delete_session(session_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages_result = await db.execute(select(ChatMessage).where(ChatMessage.session_id == session_id))
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
    return await get_token_budget_status()


async def chat_ws_handler(websocket: WebSocket, user_id: str) -> None:
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") != "message":
                continue

            user_content = data.get("content", "")
            session_id_str = data.get("session_id")

            if not session_id_str:
                async with AsyncSessionLocal() as session:
                    new_session = ChatSession(user_id=user_id)
                    session.add(new_session)
                    await session.commit()
                    await session.refresh(new_session)
                    session_id = new_session.id
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
                async for event in stream_chat_response(session_id, user_content, history):
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

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("Chat WebSocket error: %s", e)
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": "Internal server error"}))
        except Exception:
            pass
