"""BYOK provider-key management.

Mounted by main.py under `/api/keys`. Control Tower spends nothing on anyone's
behalf: these are the credentials every LLM call in the product runs on.

Security rules for this module:
  * the plaintext key is accepted in a request BODY only — never a path or query
    parameter, so it cannot land in an access log or a browser history entry;
  * it is never returned, echoed in an error, or logged. Responses carry only
    `key_hint` (last 4 chars);
  * mutating routes and the outbound `test` probe are rate-limited.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.services.ai.keys import (
    PROVIDERS,
    delete_user_api_key,
    list_user_providers,
    set_user_api_key,
)

router = APIRouter(tags=["api-keys"])
logger = logging.getLogger(__name__)

# Long enough to reject an obvious paste error, short enough that nobody can
# push a payload through this field. Real keys are ~50-110 chars.
class ApiKeyBody(BaseModel):
    api_key: str = Field(min_length=16, max_length=500)


def _validate_provider(provider: str) -> str:
    if provider not in PROVIDERS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown provider. Expected one of: {', '.join(PROVIDERS)}",
        )
    return provider


@router.get("")
async def list_keys(current_user=Depends(get_current_user), db=Depends(get_db)):
    """`{provider: hint}` for every key installed. Hints only, never the key."""
    return await list_user_providers(db, current_user.id)


@router.put("/{provider}")
@limiter.limit("10/minute")
async def put_key(
    request: Request,
    provider: str,
    body: ApiKeyBody,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _validate_provider(provider)
    try:
        hint = await set_user_api_key(db, current_user.id, provider, body.api_key)
    except ValueError:
        # Deliberately generic — the offending value must not reach the client
        # or the logs.
        raise HTTPException(status_code=422, detail="Invalid API key")
    return {"provider": provider, "key_hint": hint}


@router.delete("/{provider}")
@limiter.limit("10/minute")
async def delete_key(
    request: Request,
    provider: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _validate_provider(provider)
    removed = await delete_user_api_key(db, current_user.id, provider)
    if not removed:
        raise HTTPException(status_code=404, detail="No key configured for that provider")
    return {"status": "deleted", "provider": provider}


@router.post("/{provider}/test")
@limiter.limit("5/minute")
async def test_key(
    request: Request,
    provider: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """One cheap live call (models list) to prove the stored key works.

    This makes an outbound request on user input, so it is rate-limited harder
    than the writes and given a short timeout. It reads the STORED key rather
    than taking one in the body, so a probe cannot be pointed at a key the
    account does not own.
    """
    _validate_provider(provider)
    from app.services.ai.keys import get_user_api_key

    key = await get_user_api_key(db, current_user.id, provider)
    if not key:
        raise HTTPException(status_code=404, detail="No key configured for that provider")

    try:
        if provider == "openai":
            from app.services.ai.openai_client import get_openai_client

            client = get_openai_client(key, timeout=10.0)
            await client.models.list()
        else:
            from app.services.ai.openai_client import get_anthropic_client

            client = get_anthropic_client(key, timeout=10.0)
            await client.models.list(limit=1)
    except Exception as exc:
        # Log the TYPE only. The message from some SDKs can embed the request
        # payload, and the key must never reach a log line.
        logger.info(
            "API key test failed for user %s provider %s (%s)",
            current_user.id, provider, type(exc).__name__,
        )
        return {"ok": False, "provider": provider, "error": "key_rejected"}

    return {"ok": True, "provider": provider}
