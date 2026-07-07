import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.quote import SavedQuote

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


class SaveQuoteBody(BaseModel):
    text: str = Field(min_length=1)
    author: Optional[str] = None


class PatchQuoteBody(BaseModel):
    text: Optional[str] = Field(default=None, min_length=1)
    author: Optional[str] = None
    favorite: Optional[bool] = None


class SavedQuoteOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    text: str
    author: Optional[str]
    favorite: bool
    saved_at: datetime


# NOTE: literal paths (/random, /saved, /save) MUST be declared before the
# /{quote_id} param routes — FastAPI matches in declaration order and a
# param route would shadow them (422 on UUID parse).

@router.get("", response_model=List[SavedQuoteOut])
async def list_quotes(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        select(SavedQuote)
        .where(SavedQuote.user_id == current_user.id)
        .order_by(desc(SavedQuote.saved_at))
    )
    return result.scalars().all()


@router.post("", response_model=SavedQuoteOut, status_code=201)
async def create_quote(
    body: SaveQuoteBody,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    quote = SavedQuote(
        user_id=current_user.id,
        text=body.text,
        author=body.author,
        favorite=False,
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote


@router.get("/random", response_model=SavedQuoteOut)
async def get_random_quote(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        select(SavedQuote).where(SavedQuote.user_id == current_user.id)
    )
    quotes = result.scalars().all()
    if not quotes:
        # Return a fallback quote if none are saved
        return {
            "id": uuid.uuid4(),
            "text": "Write code that matters.",
            "author": "Anonymous",
            "favorite": False,
            "saved_at": datetime.utcnow()
        }
    import random
    return random.choice(quotes)


@router.get("/saved", response_model=List[SavedQuoteOut])
async def list_saved_quotes(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    return await list_quotes(current_user, db)


@router.post("/save", response_model=SavedQuoteOut, status_code=201)
async def save_quote(
    body: SaveQuoteBody,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    return await create_quote(body, current_user, db)


@router.delete("/save/{quote_id}", status_code=204)
async def delete_saved_quote(
    quote_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    return await delete_quote(quote_id, current_user, db)


@router.get("/{quote_id}", response_model=SavedQuoteOut)
async def get_quote(
    quote_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        select(SavedQuote).where(
            SavedQuote.id == quote_id,
            SavedQuote.user_id == current_user.id,
        )
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.patch("/{quote_id}", response_model=SavedQuoteOut)
async def patch_quote(
    quote_id: uuid.UUID,
    body: PatchQuoteBody,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        select(SavedQuote).where(
            SavedQuote.id == quote_id,
            SavedQuote.user_id == current_user.id,
        )
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if body.text is not None:
        quote.text = body.text
    if body.author is not None:
        quote.author = body.author
    if body.favorite is not None:
        quote.favorite = body.favorite

    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote


@router.delete("/{quote_id}", status_code=204)
async def delete_quote(
    quote_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        select(SavedQuote).where(
            SavedQuote.id == quote_id,
            SavedQuote.user_id == current_user.id,
        )
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    await db.delete(quote)
    await db.commit()
