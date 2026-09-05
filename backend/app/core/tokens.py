"""Token counting and chunking, with a working fallback when tiktoken can't load.

`tiktoken.get_encoding` downloads its BPE table from the network on first call
and caches it on disk. Calling it at import time turns "no egress to
openaipublic.blob.core.windows.net" into a crash-on-boot for the whole backend,
which is a real risk on a PaaS with locked-down egress or a cold cache.

So the encoder is resolved lazily on first use and every consumer degrades to a
~4-chars-per-token approximation rather than raising. Counting is used for
history trimming and chunk sizing — both tolerate an approximation far better
than they tolerate the process dying.
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ~4 characters per token for English text. Used for both counting and chunking
# when the real encoder is unavailable.
_CHARS_PER_TOKEN = 4

_encoding: Any = None
_resolved = False


def get_encoding() -> Any:
    """Return the cl100k_base encoder, or None if it cannot be loaded."""
    global _encoding, _resolved
    if not _resolved:
        _resolved = True
        try:
            import tiktoken

            _encoding = tiktoken.get_encoding("cl100k_base")
        except Exception as e:  # network, disk, or a tiktoken version change
            logger.warning(
                "tiktoken encoder unavailable (%s) — falling back to a "
                "~%d-chars-per-token estimate for counting and chunking",
                e,
                _CHARS_PER_TOKEN,
            )
            _encoding = None
    return _encoding


def count_tokens(text: str) -> int:
    """Best-effort token count. Never raises."""
    encoding = get_encoding()
    if encoding is not None:
        try:
            return len(encoding.encode(text))
        except Exception:
            pass
    return len(text) // _CHARS_PER_TOKEN


def chunk_text(text: str, chunk_tokens: int, overlap_tokens: int) -> list[str]:
    """Split text into overlapping chunks of roughly `chunk_tokens` tokens.

    `overlap_tokens` must be smaller than `chunk_tokens`, otherwise the window
    would never advance and this would loop forever.
    """
    if chunk_tokens <= 0:
        raise ValueError("chunk_tokens must be positive")
    if overlap_tokens < 0 or overlap_tokens >= chunk_tokens:
        raise ValueError("overlap_tokens must be >= 0 and < chunk_tokens")
    if not text:
        return []

    encoding = get_encoding()
    if encoding is not None:
        try:
            tokens = encoding.encode(text)
            chunks: list[str] = []
            start = 0
            while start < len(tokens):
                chunks.append(encoding.decode(tokens[start : start + chunk_tokens]))
                start += chunk_tokens - overlap_tokens
            return chunks
        except Exception as e:
            logger.warning("tiktoken chunking failed (%s) — using character chunking", e)

    size = chunk_tokens * _CHARS_PER_TOKEN
    stride = (chunk_tokens - overlap_tokens) * _CHARS_PER_TOKEN
    return [text[i : i + size] for i in range(0, len(text), stride)]
