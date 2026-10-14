"""In-memory vector store — offline tests and the ``memory`` backend.

Holds vectors in a dict and scores by cosine similarity. Intended for small
corpora in tests; not for production.

TODO: implement.
"""

from __future__ import annotations

from collections.abc import Sequence

from brh_core.embeddings.base import Embedder
from brh_core.models import RetrievedChunk, VectorRecord


class InMemoryVectorStore:
    """A toy vector store backed by a Python dict."""

    def __init__(self, embedder: Embedder) -> None:
        self._embedder = embedder
        self._vectors: dict[str, list[float]] = {}
        self._records: dict[str, VectorRecord] = {}

    def upsert(self, records: Sequence[VectorRecord]) -> int:
        """Embed and store records; returns the number written."""
        raise NotImplementedError("TODO: embed + store records")

    def search(
        self,
        query: str,
        *,
        top_k: int = 6,
        filter: dict[str, object] | None = None,
    ) -> list[RetrievedChunk]:
        """Cosine-similarity search over the stored vectors."""
        raise NotImplementedError("TODO: embed query + rank by cosine similarity")

    def count(self) -> int:
        raise NotImplementedError("TODO: number of stored records")
