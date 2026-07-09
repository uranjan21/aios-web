"""pgvector cosine similarity search over vault chunks."""
import logging
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


def _get_openai_client() -> Optional[AsyncOpenAI]:
    global _openai_client
    settings = get_settings()
    if not settings.openai_api_key:
        return None
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


async def _embed_query(query: str) -> Optional[list[float]]:
    client = _get_openai_client()
    if client is None:
        return None
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=[query])
    return response.data[0].embedding


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
