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
        records = list(records)
        if not records:
            return 0
        vectors = self._embedder.embed_documents([record.text for record in records])
        if len(vectors) != len(records):
            raise ValueError("embedder returned a different number of vectors")
        for record, vector in zip(records, vectors, strict=True):
            if len(vector) != self._embedder.dimension:
                raise ValueError("embedder returned a vector with the wrong dimension")
            self._records[record.id] = record
            self._vectors[record.id] = list(vector)
        return len(records)

    def delete(self, ids: Sequence[str]) -> int:
        """Delete records and their vectors by stable chunk ID."""
        deleted = 0
        for record_id in ids:
            if record_id in self._records:
                self._records.pop(record_id)
                self._vectors.pop(record_id, None)
                deleted += 1
        return deleted

    def search(
        self,
        query: str,
        *,
        top_k: int = 6,
        filter: dict[str, object] | None = None,
    ) -> list[RetrievedChunk]:
        """Cosine-similarity search over the stored vectors."""
        if top_k <= 0 or not self._records:
            return []
        query_vector = self._embedder.embed_query(query)
        if len(query_vector) != self._embedder.dimension:
            raise ValueError("embedder returned a query vector with the wrong dimension")
        scored = [
            (record_id, _dot(query_vector, self._vectors[record_id]))
            for record_id, record in self._records.items()
            if _matches_filter(record.metadata, filter)
        ]
        scored.sort(key=lambda item: (-item[1], item[0]))
        return [
            RetrievedChunk(
                chunk_id=record_id,
                document_id=str(self._records[record_id].metadata.get("document_id", "")),
                page_number=int(self._records[record_id].metadata.get("page_number", 0)),
                text=self._records[record_id].text,
                score=score,
                metadata=dict(self._records[record_id].metadata),
            )
            for record_id, score in scored[:top_k]
        ]

    def count(self) -> int:
        return len(self._records)


def _dot(left: Sequence[float], right: Sequence[float]) -> float:
    return sum(a * b for a, b in zip(left, right, strict=True))


def _matches_filter(metadata: dict[str, object], filter: dict[str, object] | None) -> bool:
    if not filter:
        return True
    return all(metadata.get(key) == expected for key, expected in filter.items())
