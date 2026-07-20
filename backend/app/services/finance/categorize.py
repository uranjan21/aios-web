"""Server-side resolution of an LLM's free-string category suggestion (plus the
payee/merchant name) to a real node in the user's category tree, so the review
UI's category picker arrives pre-filled instead of defaulting to None.

Mirrors the client-side keyword table in ImportCsvModal.guessCategory, mapped
onto the default category names seeded by api/areas/finance._DEFAULT_CATEGORIES.
"""
import re
import uuid
from typing import Optional

from sqlmodel import select

from app.models.finance import Category

# merchant/keyword regex -> default TOP-LEVEL category name (expense tree)
_KEYWORD_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"swiggy|zomato|dominos|mcdonald|kfc|starbucks|cafe|restaurant|eatsure|blinkit|zepto|bigbasket|grocer", re.I), "Food"),
    (re.compile(r"uber|ola\b|rapido|irctc|redbus|makemytrip|fuel|petrol|diesel|hpcl|iocl|bpcl|fastag|metro", re.I), "Transport"),
    (re.compile(r"electricity|bescom|water bill|airtel|jio|vodafone|bsnl|broadband|wifi|dth|recharge|gas\b|utility", re.I), "Bills & Utilities"),
    (re.compile(r"\brent\b|nobroker|maintenance|society", re.I), "Housing"),
    (re.compile(r"amazon|flipkart|myntra|ajio|nykaa|ikea|decathlon|croma|reliance digital", re.I), "Shopping"),
    (re.compile(r"pharmacy|apollo|1mg|pharmeasy|netmeds|hospital|clinic|doctor|cult\b|gym|insurance", re.I), "Health"),
    (re.compile(r"netflix|prime video|hotstar|spotify|youtube|bookmyshow|pvr|steam|subscription", re.I), "Entertainment"),
    (re.compile(r"udemy|coursera|byjus|course|tuition", re.I), "Education"),
    (re.compile(r"salary|payroll", re.I), "Salary"),
    (re.compile(r"dividend|interest credit|mutual fund|zerodha|groww|upstox", re.I), "Investments"),
    (re.compile(r"refund|reversal|cashback", re.I), "Refunds"),
]


async def match_suggested_category(
    db,
    user_id: uuid.UUID,
    kind: str,
    suggested: Optional[str],
    payee: Optional[str] = None,
) -> Optional[uuid.UUID]:
    """Best-effort match; returns None when nothing fits (user picks manually)."""
    cats = (await db.execute(
        select(Category).where(Category.user_id == user_id)
    )).scalars().all()
    cats = [c for c in cats if (c.kind or "expense") == kind]
    if not cats:
        return None

    by_name = {c.name.strip().lower(): c for c in cats}

    # 1. The suggestion names a category (or one contains the other).
    if suggested and suggested.strip():
        s = suggested.strip().lower()
        if s in by_name:
            return by_name[s].id
        for name, cat in by_name.items():
            if s in name or name in s:
                return cat.id

    # 2. Merchant keyword rules → default top-level names.
    haystack = " ".join(filter(None, [suggested, payee]))
    if haystack:
        for pattern, target in _KEYWORD_RULES:
            if pattern.search(haystack):
                cat = by_name.get(target.lower())
                if cat:
                    return cat.id
    return None
