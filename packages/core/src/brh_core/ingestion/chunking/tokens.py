"""Token measurement and safe budgeting for chunking.

The production embedder owns the exact tokenizer. The chunker therefore accepts
an injected counter, while the default remains a deliberately conservative
offline estimator. The estimator is a safety fallback, not a claim about the
embedding model's exact tokenization.
"""

from __future__ import annotations

import math
from typing import Protocol

# multilingual-e5-large has a 512-token input limit. Keep a material reserve
# for model special tokens, prefixes and estimator error.
EMBEDDING_CONTEXT_LIMIT = 512
DEFAULT_TOKEN_RESERVE = 64
DEFAULT_MAX_TOKENS = EMBEDDING_CONTEXT_LIMIT - DEFAULT_TOKEN_RESERVE

# Ratios are intentionally lower than the observed French average. OCR noise,
# digits, punctuation and HTML all produce denser subword sequences.
PROSE_CHARS_PER_TOKEN = 2.75
TABLE_CHARS_PER_TOKEN = 1.9


class TokenCounter(Protocol):
    """Callable shape accepted by every chunking policy."""

    def __call__(self, text: str) -> int: ...


def estimate_tokens(text: str) -> int:
    """Conservative offline estimate; prefer an exact model tokenizer.

    The UTF-8 term protects against accented and unusual OCR text being treated
    as one cheap character. It is intentionally biased toward overestimation;
    an underfilled chunk costs index space, while a truncated chunk loses
    evidence permanently.
    """
    ratio = TABLE_CHARS_PER_TOKEN if _looks_tabular(text) else PROSE_CHARS_PER_TOKEN
    by_chars = math.ceil(len(text) / ratio)
    by_bytes = math.ceil(len(text.encode("utf-8")) / (ratio * 1.25))
    return max(1, by_chars, by_bytes)


def huggingface_counter(model_name: str) -> tuple[str, TokenCounter]:
    """Build an exact counter when the optional Transformers dependency exists.

    ``transformers`` is intentionally optional in ``brh-core`` because the
    default Pinecone-integrated path does not need a local model. Production
    ingestion should inject this counter when a local tokenizer is available.
    """
    try:
        from transformers import AutoTokenizer
    except ImportError as exc:  # pragma: no cover - deployment-only path
        raise RuntimeError(
            "Exact model tokenization requires the optional 'transformers' dependency"
        ) from exc

    tokenizer = AutoTokenizer.from_pretrained(model_name)

    def count(text: str) -> int:
        return len(tokenizer.encode(text, add_special_tokens=True))

    return f"hf:{model_name}", count


def _looks_tabular(text: str) -> bool:
    return "\n|" in text or "<tr" in text.lower()
