"""GDPR data export (Art. 15 access / Art. 20 portability).

The mirror image of ``DELETE /api/auth/me``: that handler derives its table set
from the live ORM metadata so it cannot rot when a new user-data table is added,
and this one does exactly the same thing for the read side. Any table carrying a
``user_id`` column is exported; nothing is hand-listed.

Three properties this file exists to guarantee, all covered by
``tests/test_data_export.py``:

1. **Never another tenant's rows.** Every statement is
   ``WHERE user_id = :uid``; the ``users`` row is fetched by primary key.
2. **Never a secret.** Password hashes, verification/reset tokens and every
   ``*_encrypted`` column are dropped from the payload — an export is a copy of
   the user's *data*, not a credential dump that widens the blast radius of a
   stolen export file.
3. **Bounded memory.** The response is streamed table-by-table, row-batch by
   row-batch. Building one dict of every row a heavy user owns is exactly the
   OOM shape the 2026-08-16 audit flagged elsewhere (S1).
"""

import json
import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, AsyncIterator

import sqlalchemy as sa
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlmodel import SQLModel

from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.models.user import User

router = APIRouter(prefix="/api/export", tags=["export"])

EXPORT_VERSION = 1

#: Rows are fetched in batches of this size, never all at once.
_BATCH = 500

#: Columns that must never leave the server, matched by exact name.
_SECRET_COLUMNS = {
    "password_hash",
    "email_verification_token",
    "password_reset_token",
    "token_version",
    # pgvector payload — machine-generated, enormous, and not the user's data
    # in any meaningful sense.
    "embedding",
}

#: Columns that must never leave the server, matched by suffix. Covers
#: ``user_api_keys.key_encrypted`` and ``integration_credentials.*_encrypted``
#: without needing to know they exist.
_SECRET_SUFFIXES = ("_encrypted",)

#: Columns of the ``users`` row that ARE safe to return (allowlist, because the
#: user table is the one place secrets and profile live side by side).
_USER_FIELDS = (
    "id",
    "email",
    "name",
    "picture_url",
    "auth_provider",
    "is_admin",
    "llm_provider",
    "openai_chat_model",
    "claude_model",
    "email_verified",
    "created_at",
    "updated_at",
)


def is_secret_column(name: str) -> bool:
    """True if `name` must be withheld from an export. Public for the tests."""
    return name in _SECRET_COLUMNS or name.endswith(_SECRET_SUFFIXES)


def _jsonable(value: Any) -> Any:
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        return None
    return value


def _dump(obj: Any) -> str:
    return json.dumps(obj, default=_jsonable)


def exportable_tables() -> list[sa.Table]:
    """Every ORM table carrying a ``user_id`` column, in stable name order.

    Same derivation as the delete path in ``api/auth.py`` — that is what keeps
    export and erasure describing the same set of data as the schema grows.
    """
    import app.models  # noqa: F401 — register every model in the metadata

    return sorted(
        (t for t in SQLModel.metadata.sorted_tables if "user_id" in t.columns),
        key=lambda t: t.name,
    )


async def _existing_tables(conn) -> set[str]:
    """Table names actually present in this database (migrations may lag)."""

    def _names(sync_conn) -> set[str]:
        return set(sa.inspect(sync_conn).get_table_names())

    return await conn.run_sync(_names)


async def _stream_export(user_id: uuid.UUID) -> AsyncIterator[str]:
    """Yield the export document as JSON text, one bounded chunk at a time.

    Opens its own session rather than taking the request-scoped one: FastAPI
    tears down ``yield`` dependencies before a StreamingResponse body finishes
    sending, so a `Depends(get_db)` session would already be closed here.
    """
    from app.db.session import AsyncSessionLocal

    uid = str(user_id)

    async with AsyncSessionLocal() as db:
        conn = await db.connection()
        existing = await _existing_tables(conn)

        yield (
            "{"
            f'"export_version": {EXPORT_VERSION},'
            f'"generated_at": {_dump(datetime.utcnow().isoformat())},'
            f'"user_id": {_dump(uid)},'
        )

        # ── the profile row itself (allowlisted columns only) ──────────
        row = (
            await db.execute(sa.select(User).where(User.id == user_id))
        ).scalar_one_or_none()
        profile = (
            {f: _jsonable(getattr(row, f, None)) for f in _USER_FIELDS} if row else None
        )
        yield f'"user": {_dump(profile)},"tables": {{'

        first_table = True
        for table in exportable_tables():
            if table.name not in existing:
                continue
            columns = [c for c in table.columns if not is_secret_column(c.name)]
            if not columns:
                continue

            yield ("" if first_table else ",") + f"{_dump(table.name)}: ["
            first_table = False

            # Core select against the Table object, not hand-written SQL: it is
            # what makes the UUID comparison work on both Postgres (native
            # uuid) and the SQLite the tests run on (32-char hex).
            names = [c.name for c in columns]
            # OFFSET paging is only safe under a *total* order — ordering by a
            # non-unique column lets Postgres return a row twice (or never)
            # across pages. Prefer the primary key; fall back to every column.
            order_by = list(table.primary_key.columns) or columns
            base = (
                sa.select(*columns)
                .where(table.c.user_id == user_id)
                .order_by(*order_by)
            )
            offset = 0
            first_row = True
            while True:
                batch = (
                    await db.execute(base.limit(_BATCH).offset(offset))
                ).all()
                if not batch:
                    break
                for row in batch:
                    yield ("" if first_row else ",") + _dump(dict(zip(names, row)))
                    first_row = False
                if len(batch) < _BATCH:
                    break
                offset += _BATCH

            yield "]"

        yield "}}"


@router.get("")
@limiter.limit("2/hour")
async def export_my_data(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Download every row this account owns as a single JSON document.

    Hard rate limit: this walks ~70 tables and is the most expensive read in
    the API. Two per hour is enough for a genuine subject-access request and
    far too few to be useful as a DoS lever.
    """
    filename = f"control-tower-export-{datetime.utcnow():%Y%m%d}.json"
    return StreamingResponse(
        _stream_export(current_user.id),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
