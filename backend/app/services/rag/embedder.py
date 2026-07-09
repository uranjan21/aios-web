"""Chunk vault files and embed via text-embedding-3-small (OpenAI)."""
import logging
import uuid
from datetime import datetime

import tiktoken
from openai import AsyncOpenAI
from sqlalchemy import delete as sa_delete
from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.vault import VaultChunk, VaultFile

logger = logging.getLogger(__name__)

CHUNK_TOKENS = 500
OVERLAP_TOKENS = 50
EMBEDDING_MODEL = "text-embedding-3-small"

_encoder = tiktoken.get_encoding("cl100k_base")

_openai_client = None


def _get_openai_client(api_key: str | None = None):
    # We create a new client if api_key is provided to avoid caching the user's key globally
    if api_key:
        return AsyncOpenAI(api_key=api_key)
    
    global _openai_client
    settings = get_settings()
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


def _chunk_text(text: str) -> list[str]:
    tokens = _encoder.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = start + CHUNK_TOKENS
        chunk_tokens = tokens[start:end]
        chunks.append(_encoder.decode(chunk_tokens))
        start += CHUNK_TOKENS - OVERLAP_TOKENS
    return chunks


async def _embed_texts(texts: list[str]) -> list[list[float]]:
    client = _get_openai_client()
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


async def embed_vault_file(user_id: uuid.UUID, rel_path: str, content: str) -> None:
    if not content.strip():
        return

    settings = get_settings()
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY not set — skipping embedding for %s", rel_path)
        return

    chunks = _chunk_text(content)
    if not chunks:
        return

    try:
        embeddings = await _embed_texts(chunks)
    except Exception as e:
        logger.error("Embedding failed for %s: %s", rel_path, e)
        return

    if len(embeddings) != len(chunks):
        logger.error(
            "Embedding count mismatch for %s: %d chunks but %d embeddings — skipping update",
            rel_path, len(chunks), len(embeddings),
        )
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(VaultFile).where(VaultFile.user_id == user_id).where(VaultFile.path == rel_path))
        vault_file = result.scalar_one_or_none()
        if not vault_file:
            return

        # Bulk delete old chunks
        await session.execute(sa_delete(VaultChunk).where(VaultChunk.file_id == vault_file.id))

        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            session.add(VaultChunk(
                user_id=user_id,
                file_id=vault_file.id,
                chunk_index=i,
                content=chunk_text,
                embedding=embedding,
                created_at=datetime.utcnow(),
            ))

        await session.commit()
    logger.debug("Embedded %d chunks for %s", len(chunks), rel_path)
