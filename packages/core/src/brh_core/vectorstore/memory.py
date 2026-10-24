"""In-memory vector store — offline tests and the ``memory`` backend.

Holds vectors in a dict and scores by cosine similarity. Intended for small
corpora in tests; not for production.

Each store instance has a fresh target identity because its contents are ephemeral.
"""

from __future__ import annotations

from collections.abc import Sequence
from math import isfinite, sqrt
from uuid import uuid4

from brh_core.embeddings.base import Embedder
from brh_core.models import RetrievedChunk, VectorRecord


class InMemoryVectorStore:
    """A toy vector store backed by a Python dict."""

    def __init__(self, embedder: Embedder) -> None:
        self._embedder = embedder
        self.target_id = f"memory:{uuid4().hex}"
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
        prepared = []
        for record, vector in zip(records, vectors, strict=True):
            if len(vector) != self._embedder.dimension:
                raise ValueError("embedder returned a vector with the wrong dimension")
            if not all(isfinite(value) for value in vector):
                raise ValueError("embedder returned a non-finite vector")
            norm = sqrt(sum(value * value for value in vector))
            prepared.append((record, [value / norm for value in vector] if norm else list(vector)))
        for record, vector in prepared:
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
        norm = sqrt(sum(value * value for value in query_vector))
        if norm:
            query_vector = [value / norm for value in query_vector]
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

    def list_ids(self, prefix: str) -> list[str]:
        return sorted(record_id for record_id in self._records if record_id.startswith(prefix))

    def verify(self, records: Sequence[VectorRecord], *, absent_ids: Sequence[str] = ()) -> None:
        if any(self._records.get(record.id) != record for record in records):
            raise RuntimeError("Indexed records do not match desired content")
        if any(record_id in self._records for record_id in absent_ids):
            raise RuntimeError("Stale records remain in the index")

    def matching_ids(self, records: Sequence[VectorRecord]) -> set[str]:
        return {record.id for record in records if self._records.get(record.id) == record}


def _dot(left: Sequence[float], right: Sequence[float]) -> float:
    return sum(a * b for a, b in zip(left, right, strict=True))


def _matches_filter(metadata: dict[str, object], filter: dict[str, object] | None) -> bool:
    if not filter:
        return True
    return all(metadata.get(key) == expected for key, expected in filter.items())
