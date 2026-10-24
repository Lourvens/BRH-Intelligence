"""Deterministic, offline embedder.

Not semantic — hash whitespace tokens into a fixed-width vector. Its only jobs
are (a) letting tests and the ``memory`` vector backend run with no network and
no keys, and (b) being reproducible. Never use it in production retrieval.

TODO: implement.
"""

from __future__ import annotations

import math
import re
from collections.abc import Sequence
from hashlib import sha256

_TOKEN_RE = re.compile(r"\w+(?:['’]\w+)?", re.UNICODE)


class HashingEmbedder:
    """A bag-of-hashed-tokens embedder producing L2-normalized vectors."""

    def __init__(self, dimension: int = 1024) -> None:
        if dimension <= 0:
            raise ValueError("dimension must be positive")
        self._dimension = dimension

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed a batch of passages."""
        return [self._embed(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query."""
        return self._embed(text)

    def _embed(self, text: str) -> list[float]:
        """Hash each token to an index, count, then L2-normalize."""
        vector = [0.0] * self._dimension
        for token in _TOKEN_RE.findall(text.casefold()):
            digest = sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:8], "big") % self._dimension
            vector[index] += 1.0 if digest[8] & 1 else -1.0
        norm = math.sqrt(sum(value * value for value in vector))
        return [value / norm for value in vector] if norm else vector
