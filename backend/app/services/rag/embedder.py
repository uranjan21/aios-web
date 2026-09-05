"""Chunk vault files and embed via text-embedding-3-small (OpenAI)."""
import logging
import uuid
from datetime import datetime

from sqlalchemy import delete as sa_delete
from sqlmodel import select

from app.core.tokens import chunk_text as split_into_chunks
from app.db.session import AsyncSessionLocal
from app.models.vault import VaultChunk, VaultFile
from app.services.ai.keys import get_user_api_key
from app.services.ai.openai_client import get_openai_client

logger = logging.getLogger(__name__)

CHUNK_TOKENS = 500
OVERLAP_TOKENS = 50
EMBEDDING_MODEL = "text-embedding-3-small"


def _chunk_text(text: str) -> list[str]:
    return split_into_chunks(text, CHUNK_TOKENS, OVERLAP_TOKENS)


async def _embed_texts(texts: list[str], api_key: str) -> list[list[float]]:
    client = get_openai_client(api_key)
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


async def embed_vault_file(user_id: uuid.UUID, rel_path: str, content: str) -> None:
    if not content.strip():
        return

    # BYOK: embeddings run on the vault owner's own OpenAI key. No key means no
    # indexing — a background sweep, so it degrades silently instead of raising.
    async with AsyncSessionLocal() as session:
        api_key = await get_user_api_key(session, user_id, "openai")
    if not api_key:
        logger.debug("No OpenAI key for user %s — skipping embedding for %s", user_id, rel_path)
        return

    chunks = _chunk_text(content)
    if not chunks:
        return

    try:
        embeddings = await _embed_texts(chunks, api_key)
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
