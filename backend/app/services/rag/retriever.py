"""pgvector cosine similarity search over vault chunks."""
import logging
import time
from collections import OrderedDict
from typing import Optional

from openai import AsyncOpenAI
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_MIN_SIMILARITY = 0.70
MAX_TOP_K = 10

_openai_client: Optional[AsyncOpenAI] = None

# The chat turn embeds the user message for context RAG and the model may then
# call search_vault with the same text — memoize so one turn costs one embed.
_embed_cache: OrderedDict[str, list[float]] = OrderedDict()
_EMBED_CACHE_MAX = 64

# Chunk-presence memo: skip embedding entirely for users with no indexed
# content. True is stable (chunks aren't bulk-deleted); False expires so a
# first knowledge pull is picked up.
_chunk_presence: dict[str, tuple[bool, float]] = {}
_CHUNKLESS_RECHECK_SECONDS = 300.0


def _get_openai_client() -> Optional[AsyncOpenAI]:
    global _openai_client
    settings = get_settings()
    if not settings.openai_api_key:
        return None
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


async def _embed_query(query: str) -> Optional[list[float]]:
    cached = _embed_cache.get(query)
    if cached is not None:
        _embed_cache.move_to_end(query)
        return cached
    client = _get_openai_client()
    if client is None:
        return None
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=[query])
    embedding = response.data[0].embedding
    _embed_cache[query] = embedding
    while len(_embed_cache) > _EMBED_CACHE_MAX:
        _embed_cache.popitem(last=False)
    return embedding


async def user_has_chunks(user_id) -> bool:
    """Cheap existence check so callers can skip the embedding API call."""
    key = str(user_id)
    hit = _chunk_presence.get(key)
    if hit is not None and (hit[0] or time.monotonic() < hit[1]):
        return hit[0]
    async with AsyncSessionLocal() as session:
        row = (
            await session.execute(
                text("SELECT 1 FROM vault_chunks WHERE user_id = :uid LIMIT 1"), {"uid": key}
            )
        ).first()
    present = row is not None
    _chunk_presence[key] = (present, time.monotonic() + _CHUNKLESS_RECHECK_SECONDS)
    return present


async def search(
    query: str,
    top_k: int = 5,
    min_similarity: float = DEFAULT_MIN_SIMILARITY,
    user_id=None,
) -> list[dict]:
    """Cosine search over vault chunks. user_id is required in practice — without it
    results would cross tenant boundaries; None is only tolerated so legacy callers
    fail closed (empty result) rather than leak."""
    if user_id is None:
        logger.warning("retriever.search called without user_id — returning no results")
        return []
    top_k = min(top_k, MAX_TOP_K)
    embedding = await _embed_query(query)
    if embedding is None:
        return []

    vector_str = "[" + ",".join(str(v) for v in embedding) + "]"

    sql = text("""
        SELECT vc.id, vc.content, vc.chunk_index, vf.path, vf.area,
               1 - (vc.embedding <=> CAST(:vec AS vector)) AS similarity
        FROM vault_chunks vc
        JOIN vault_files vf ON vf.id = vc.file_id
        WHERE vc.embedding IS NOT NULL
          AND vf.user_id = :uid
          AND 1 - (vc.embedding <=> CAST(:vec AS vector)) >= :min_sim
        ORDER BY vc.embedding <=> CAST(:vec AS vector)
        LIMIT :top_k
    """)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            sql, {"vec": vector_str, "top_k": top_k, "min_sim": min_similarity, "uid": str(user_id)}
        )
        rows = result.fetchall()

    return [
        {
            "id": str(row.id),
            "content": row.content,
            "path": row.path,
            "area": row.area,
            "similarity": float(row.similarity),
        }
        for row in rows
    ]
