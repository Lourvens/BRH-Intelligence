"""The vector-store interface."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol, runtime_checkable

from brh_core.models import RetrievedChunk, VectorRecord


@runtime_checkable
class VectorStore(Protocol):
    """Text-in / hits-out semantic search."""

    def upsert(self, records: Sequence[VectorRecord]) -> int:
        """Index records. Returns the number written."""
        ...

    def delete(self, ids: Sequence[str]) -> int:
        """Delete vector IDs and return the number requested for deletion."""
        ...

    def search(
        self,
        query: str,
        *,
        top_k: int = 6,
        filter: dict[str, object] | None = None,
    ) -> list[RetrievedChunk]:
        """Return the ``top_k`` most relevant chunks for ``query``."""
        ...

    def count(self) -> int:
        """Number of vectors currently indexed (best effort)."""
        ...

    def list_ids(self, prefix: str) -> list[str]:
        """Enumerate IDs owned by a document prefix for reconciliation."""
        ...

    def matching_ids(self, records: Sequence[VectorRecord]) -> set[str]:
        """Return IDs whose stored text and version metadata match the intent."""
        ...

    def verify(self, records: Sequence[VectorRecord], *, absent_ids: Sequence[str] = ()) -> None:
        """Raise unless desired versions are visible and stale IDs are absent."""
        ...
