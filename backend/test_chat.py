"""Manual chat WebSocket probe — NOT a pytest test.

Run directly against a live backend: `uv run python test_chat.py`.
(The function is deliberately not named test_* so pytest doesn't collect it —
it needs a running server and a real user row.)
"""
import asyncio
import json
from uuid import uuid4
import websockets


async def manual_chat_probe():
    import os
    import sys
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from app.core.security import create_access_token
    from app.db.session import AsyncSessionLocal
    from app.models.user import User
    from sqlmodel import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        user = result.scalars().first()
        if not user:
            print("No user found")
            return

    token = create_access_token({"sub": str(user.id)})

    # AIOS backend runs on :8001 (:8000 is a different project).
    uri = f"ws://localhost:8001/ws/chat?token={token}"
    try:
        async with websockets.connect(uri) as ws:
            payload = {
                "type": "message",
                "content": "Hello! What is your name?",
                "session_id": str(uuid4()),
                "provider": "openai",
                "model": "gpt-4o-mini",
            }
            await ws.send(json.dumps(payload))
            print(f"Sent: {payload}")

            # Read all responses until the server closes or stops sending chunks
            while True:
                response = await ws.recv()
                data = json.loads(response)
                print(f"Received: {data['type']}")
                if data["type"] == "error":
                    print(f"Error: {data}")
                    break
                if data["type"] == "chunk":
                    print(data["content"], end="", flush=True)
                if data["type"] == "tool_call":
                    print(f"\nTool call: {data}")

    except Exception as e:
        print(f"Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(manual_chat_probe())
