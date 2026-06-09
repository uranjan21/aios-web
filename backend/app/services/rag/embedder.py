"""Chunk vault files and embed via text-embedding-3-small (OpenAI)."""
import asyncio
import logging
import uuid
from datetime import datetime, timezone

import tiktoken
from openai import AsyncOpenAI
from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.vault import VaultChunk, VaultFile

logger = logging.getLogger(__name__)

CHUNK_TOKENS = 500
OVERLAP_TOKENS = 50
EMBEDDING_MODEL = "text-embedding-3-small"

_encoder = tiktoken.get_encoding("cl100k_base")


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
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


async def embed_vault_file(rel_path: str, content: str) -> None:
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

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(VaultFile).where(VaultFile.path == rel_path))
        vault_file = result.scalar_one_or_none()
        if not vault_file:
            return

        # Delete old chunks
        old = await session.execute(select(VaultChunk).where(VaultChunk.file_id == vault_file.id))
        for chunk in old.scalars().all():
            await session.delete(chunk)

        # Insert new chunks
        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            session.add(VaultChunk(
                file_id=vault_file.id,
                chunk_index=i,
                content=chunk_text,
                embedding=embedding,
                created_at=datetime.now(timezone.utc),
            ))

        await session.commit()
    logger.debug("Embedded %d chunks for %s", len(chunks), rel_path)
