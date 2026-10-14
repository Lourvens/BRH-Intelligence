"""Deterministic, offline embedder.

Not semantic — hash whitespace tokens into a fixed-width vector. Its only jobs
are (a) letting tests and the ``memory`` vector backend run with no network and
no keys, and (b) being reproducible. Never use it in production retrieval.

TODO: implement.
"""

from __future__ import annotations

from collections.abc import Sequence


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
        raise NotImplementedError("TODO: hash tokens into fixed-width vectors")

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query."""
        raise NotImplementedError("TODO: same as embed_documents for one text")

    def _embed(self, text: str) -> list[float]:
        """Hash each token to an index, count, then L2-normalize."""
        raise NotImplementedError("TODO: implement the token-hash kernel")
