"""Pinecone adapters.

Two shapes of Pinecone index exist and we support both (ADR-0003, ADR-0004):

* **integrated inference** — the index embeds server-side. Send text records
  via ``upsert_records`` and query with ``documents.search``; no client
  embedder is involved.
* **client-side vectors** — embed locally and call ``upsert`` / ``query``.

The adapter deliberately does not pretend Pinecone's hosted model is a
LangChain ``Embeddings`` object. LangChain is used for document and retriever
boundaries; Pinecone owns embedding inside the integrated index.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from langchain_core.documents import Document as LangChainDocument
from langchain_core.retrievers import BaseRetriever
from pydantic import ConfigDict

from brh_core.embeddings.base import Embedder
from brh_core.models import RetrievedChunk, VectorRecord


def build_pinecone_client(api_key: str) -> Any:
    """Construct a lazy Pinecone control-plane client.

    Raise a clear error when ``api_key`` is empty so ``/readyz``-style checks
    fail loudly rather than at the first query.
    """
    if not api_key:
        raise ValueError("Pinecone API key is required")
    from pinecone import Pinecone

    return Pinecone(api_key=api_key)


def _index_for(client: Any, index_name: str) -> Any:
    """Resolve an index handle using its stable host when available."""
    describe = getattr(client, "describe_index", None)
    if describe is not None:
        description = describe(index_name)
        host = _value(description, "host")
        if host:
            return client.Index(host=host)
    return client.Index(index_name)


def _value(value: Any, key: str, default: Any = None) -> Any:
    if isinstance(value, dict):
        return value.get(key, default)
    return getattr(value, key, default)


def _flat_metadata(record: VectorRecord) -> dict[str, object]:
    """Keep Pinecone metadata JSON-safe and filterable."""
    metadata: dict[str, object] = {}
    for key, value in record.metadata.items():
        if isinstance(value, (str, int, float, bool)):
            metadata[key] = value
        elif isinstance(value, (list, tuple)) and all(isinstance(item, str) for item in value):
            metadata[key] = list(value)
    return metadata


def _hit_to_retrieved(hit: Any) -> RetrievedChunk:
    fields = _value(hit, "fields", {}) or {}
    metadata = dict(fields) if isinstance(fields, dict) else {}
    text = str(metadata.pop("chunk_text", metadata.pop("text", "")))
    hit_id = str(_value(hit, "_id", _value(hit, "id", "")))
    return RetrievedChunk(
        chunk_id=hit_id,
        document_id=str(metadata.get("document_id", "")),
        page_number=int(metadata.get("page_number", 0)),
        text=text,
        score=float(_value(hit, "_score", _value(hit, "score", 0.0))),
        metadata=metadata,
    )


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
        self._client = client or build_pinecone_client(api_key)
        self._index = _index_for(self._client, index_name)
        self._namespace = namespace

    def upsert(self, records: Sequence[VectorRecord]) -> int:
        """``upsert_records``: each record is ``{_id, text, **scalar metadata}``.

        Pinecone rejects non-scalar metadata — drop nested values.
        """
        records = list(records)
        if not records:
            return 0
        payload = [
            {"_id": record.id, "chunk_text": record.text, **_flat_metadata(record)}
            for record in records
        ]
        self._index.upsert_records(self._namespace, payload)
        return len(records)

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
        if top_k <= 0:
            return []
        documents = getattr(self._index, "documents", None)
        if documents is not None and hasattr(documents, "search"):
            response = documents.search(
                namespace=self._namespace,
                top_k=top_k,
                score_by=[
                    {"type": "embed", "fields": ["chunk_text"], "query": query}
                ],
                include_fields=[
                    "chunk_text",
                    "document_id",
                    "sha256",
                    "page_number",
                    "page_end",
                    "chunk_type",
                    "section_path",
                    "chunker_id",
                    "tokenizer_id",
                    "embedding_id",
                ],
                filter=filter,
            )
        else:
            response = self._index.search_records(
                namespace=self._namespace,
                query={"inputs": {"text": query}, "top_k": top_k},
                filter=filter,
                fields=[
                    "chunk_text",
                    "document_id",
                    "sha256",
                    "page_number",
                    "page_end",
                    "chunk_type",
                    "section_path",
                    "chunker_id",
                    "tokenizer_id",
                    "embedding_id",
                ],
            )
        hits = _value(response, "result", response)
        hits = _value(hits, "hits", hits) or []
        return [_hit_to_retrieved(hit) for hit in hits]

    def count(self) -> int:
        stats = self._index.describe_index_stats()
        namespaces = _value(stats, "namespaces", {}) or {}
        namespace_stats = namespaces.get(self._namespace, {})
        return int(_value(namespace_stats, "record_count", 0))

    def as_retriever(
        self,
        *,
        top_k: int = 6,
        metadata_filter: dict[str, object] | None = None,
    ) -> BaseRetriever:
        """Expose integrated Pinecone search through LangChain's retriever API."""
        return PineconeIntegratedRetriever(
            store=self,
            top_k=top_k,
            metadata_filter=metadata_filter,
        )


class PineconeIntegratedRetriever(BaseRetriever):
    """LangChain retriever boundary over Pinecone integrated inference."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    store: PineconeIntegratedVectorStore
    top_k: int = 6
    metadata_filter: dict[str, object] | None = None

    def _get_relevant_documents(self, query: str, *, run_manager: Any) -> list[LangChainDocument]:
        hits = self.store.search(
            query,
            top_k=self.top_k,
            filter=self.metadata_filter,
        )
        return [
            LangChainDocument(
                id=hit.chunk_id,
                page_content=hit.text,
                metadata={**hit.metadata, "score": hit.score},
            )
            for hit in hits
        ]


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
