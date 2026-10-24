"""Pinecone adapters.

Two shapes of Pinecone index exist and we support both (ADR-0003, ADR-0004):

* **integrated inference** — the index embeds server-side. Send text via
  ``upsert_records`` / ``search_records``; no client embedder is involved.
* **client-side vectors** — embed locally and call ``upsert`` / ``query``.

Note from the sibling project: the records API response shape has drifted
across SDK versions (``response.matches`` vs ``response.result.hits``).
Tolerate both so an SDK bump does not break retrieval.

TODO: implement both adapters.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from brh_core.embeddings.base import Embedder
from brh_core.models import RetrievedChunk, VectorRecord


def build_pinecone_client(api_key: str) -> Any:
    """Construct a lazy Pinecone control-plane client.

    Raise a clear error when ``api_key`` is empty so ``/readyz``-style checks
    fail loudly rather than at the first query.
    """
    raise NotImplementedError("TODO: build the Pinecone client")


class PineconeIntegratedVectorStore:
    """Text-in / hits-out against an integrated-inference index."""

    def __init__(
        self,
        *,
        api_key: str,
        index_name: str,
        namespace: str = "default",
        client: Any | None = None,
    ) -> None:
        raise NotImplementedError("TODO: store config, resolve the index handle")

    def upsert(self, records: Sequence[VectorRecord]) -> int:
        """``upsert_records``: each record is ``{_id, text, **scalar metadata}``.

        Pinecone rejects non-scalar metadata — drop nested values.
        """
        raise NotImplementedError("TODO: upsert_records")

    def delete(self, ids: Sequence[str]) -> int:
        """Delete stale IDs from the integrated-inference namespace."""
        if not ids:
            return 0
        self._index.delete(ids=list(ids), namespace=self._namespace)
        return len(ids)

    def search(
        self,
        query: str,
        *,
        top_k: int = 6,
        filter: dict[str, object] | None = None,
    ) -> list[RetrievedChunk]:
        """``search_records(inputs={"text": query})``.

        ``text`` lives inside ``hit.fields``; the rest of the fields become
        metadata.
        """
        raise NotImplementedError("TODO: search_records")

    def count(self) -> int:
        raise NotImplementedError("TODO: describe_index_stats")


class PineconeClientVectorStore:
    """Client-side embedding against a standard Pinecone index."""

    def __init__(
        self,
        *,
        embedder: Embedder,
        api_key: str,
        index_name: str,
        namespace: str = "default",
        client: Any | None = None,
    ) -> None:
        raise NotImplementedError("TODO: store config + embedder")

    def upsert(self, records: Sequence[VectorRecord]) -> int:
        """Embed locally; store ``text`` in metadata for display."""
        raise NotImplementedError("TODO: index.upsert(vectors=[...])")

    def delete(self, ids: Sequence[str]) -> int:
        """Delete stale IDs from the client-side namespace."""
        if not ids:
            return 0
        self._index.delete(ids=list(ids), namespace=self._namespace)
        return len(ids)

    def search(
        self,
        query: str,
        *,
        top_k: int = 6,
        filter: dict[str, object] | None = None,
    ) -> list[RetrievedChunk]:
        """Embed the query; ``index.query(vector=..., include_metadata=True)``."""
        raise NotImplementedError("TODO: index.query(...)")

    def count(self) -> int:
        raise NotImplementedError("TODO: describe_index_stats")
