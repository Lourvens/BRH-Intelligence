"""Pinecone Records API with hosted embeddings, bounded retries and verification."""

from __future__ import annotations

import math
import time
from collections.abc import Sequence
from typing import Any

from brh_core.models import RetrievedChunk, VectorRecord


def _dict(value: Any) -> dict:
    if isinstance(value, dict):
        return value
    if hasattr(value, "to_dict"):
        return value.to_dict()
    return value.model_dump(by_alias=True)


def flat_metadata(metadata: dict) -> dict:
    projected = {}
    for key, value in metadata.items():
        if key.startswith("_"):
            continue
        if isinstance(value, (str, bool, int)) or (
            isinstance(value, float) and math.isfinite(value)
        ):
            projected[key] = value
        elif isinstance(value, (list, tuple)) and all(isinstance(item, str) for item in value):
            projected[key] = list(value)
    return projected


class PineconeIntegratedVectorStore:
    """Use the same Records API for both text upserts and semantic queries."""

    requires_exact_tokens = True

    def __init__(
        self,
        *,
        api_key: str,
        index_name: str,
        namespace: str = "default",
        model: str = "multilingual-e5-large",
        text_field: str = "chunk_text",
        batch_size: int = 96,
        timeout: float = 30,
        max_retries: int = 3,
        verify_attempts: int = 6,
        client: Any | None = None,
    ) -> None:
        if not 1 <= batch_size <= 96:
            raise ValueError("Pinecone text batches must contain 1..96 records")
        if client is None:
            if not api_key:
                raise ValueError("BRH_PINECONE_API_KEY is required")
            from pinecone import Pinecone

            client = Pinecone(api_key=api_key)
        self._client = client
        self._namespace = namespace
        self._model = model
        self._text_field = text_field
        self._timeout = timeout
        self._retries = max_retries
        self._batch = batch_size
        self._verify_attempts = verify_attempts
        description = _dict(client.describe_index(index_name))
        embed = description.get("embed") or {}
        if embed.get("model") != model:
            raise ValueError(
                f"Pinecone index model {embed.get('model')!r} does not match {model!r}"
            )
        if embed.get("field_map", {}).get("text") != text_field:
            raise ValueError(f"Pinecone index field_map.text must be {text_field!r}")
        self._index = client.Index(host=description["host"])
        self.target_id = f"pinecone-records:{description['host']}:{namespace}:{model}:{text_field}"

    def _call(self, function, **kwargs):
        for attempt in range(self._retries + 1):
            try:
                return function(**kwargs, timeout=self._timeout)
            except Exception as exc:
                status = getattr(exc, "status", getattr(exc, "status_code", None))
                retryable = status in (408, 429, 500, 502, 503, 504) or isinstance(
                    exc, (TimeoutError, ConnectionError)
                )
                if not retryable or attempt == self._retries:
                    raise
                time.sleep(min(0.5 * 2**attempt, 8))

    def upsert(self, records: Sequence[VectorRecord]) -> int:
        for offset in range(0, len(records), self._batch):
            payload = []
            for record in records[offset : offset + self._batch]:
                if not record.text.strip():
                    raise ValueError(f"Cannot embed empty chunk {record.id}")
                metadata = flat_metadata(record.metadata)
                metadata.pop(self._text_field, None)
                payload.append({**metadata, "_id": record.id, self._text_field: record.text})
            self._call(self._index.upsert_records, namespace=self._namespace, records=payload)
        return len(records)

    def search(self, query: str, *, top_k: int = 6, filter: dict | None = None):
        if not query.strip() or top_k <= 0:
            return []
        response = _dict(
            self._call(
                self._index.search,
                namespace=self._namespace,
                top_k=top_k,
                inputs={"text": query},
                filter=filter,
            )
        )
        hits = response.get("result", {}).get("hits", [])
        result = []
        for hit in hits:
            fields = dict(hit.get("fields") or {})
            text = fields.pop(self._text_field, "")
            if not text or not fields.get("document_id") or not fields.get("page_number"):
                continue
            result.append(
                RetrievedChunk(
                    chunk_id=hit.get("_id", hit.get("id", hit.get("id_"))),
                    score=hit.get("_score", hit.get("score", hit.get("score_", 0))),
                    document_id=fields["document_id"],
                    page_number=int(fields["page_number"]),
                    text=text,
                    metadata=fields,
                )
            )
        return result

    def delete(self, ids: Sequence[str]) -> int:
        for offset in range(0, len(ids), self._batch):
            self._call(
                self._index.delete,
                namespace=self._namespace,
                ids=list(ids[offset : offset + self._batch]),
            )
        return len(ids)

    def list_ids(self, prefix: str) -> list[str]:
        def collect(*, timeout):
            ids = []
            for page in self._index.list(prefix=prefix, namespace=self._namespace, timeout=timeout):
                values = _dict(page).get("vectors", [])
                ids.extend(item["id"] for item in values)
            return ids

        return self._call(collect)

    def _fetch(self, ids: Sequence[str]) -> dict:
        records = {}
        for offset in range(0, len(ids), self._batch):
            response = _dict(
                self._call(
                    self._index.fetch,
                    ids=list(ids[offset : offset + self._batch]),
                    namespace=self._namespace,
                )
            )
            records.update(response.get("vectors", {}))
        return records

    def verify(self, records: Sequence[VectorRecord], *, absent_ids: Sequence[str] = ()) -> None:
        """Bounded polling handles Pinecone's eventual consistency."""
        for attempt in range(self._verify_attempts):
            valid = len(self.matching_ids(records)) == len(records)
            if valid and not self._fetch(absent_ids):
                return
            if attempt + 1 < self._verify_attempts:
                time.sleep(min(0.5 * 2**attempt, 8))
        raise RuntimeError("Pinecone records have not converged; indexing remains retryable")

    def matching_ids(self, records: Sequence[VectorRecord]) -> set[str]:
        fetched = self._fetch([record.id for record in records])
        matched = set()
        for record in records:
            metadata = fetched.get(record.id, {}).get("metadata") or {}
            expected = flat_metadata(record.metadata)
            expected.pop(self._text_field, None)
            if metadata.get(self._text_field) == record.text and all(
                metadata.get(key) == value for key, value in expected.items()
            ):
                matched.add(record.id)
        return matched

    def count(self) -> int:
        stats = _dict(self._call(self._index.describe_index_stats))
        namespace = stats.get("namespaces", {}).get(self._namespace, {})
        return int(namespace.get("vector_count", namespace.get("record_count", 0)))

    def as_retriever(self, *, top_k=6, metadata_filter=None):
        from brh_core.vectorstore.pinecone_store import PineconeIntegratedRetriever

        return PineconeIntegratedRetriever(store=self, top_k=top_k, metadata_filter=metadata_filter)
