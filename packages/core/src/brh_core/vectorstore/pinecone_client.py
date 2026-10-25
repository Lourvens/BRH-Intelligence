"""Client-vector storage beneath the LangChain ingestion/retrieval pipeline.

LangChain runnables and the canonical RetrievalService remain the public pipeline
boundary (ADR-0012). The Pinecone SDK handles raw vectors and durable ID-based
reconciliation here; it never performs hosted embedding.
"""

from __future__ import annotations

import json
import math
import random
import time
from collections.abc import Mapping, Sequence
from email.utils import parsedate_to_datetime
from typing import Any

from pinecone.errors import PineconeConnectionError, PineconeTimeoutError

from brh_core.embeddings.base import Embedder
from brh_core.embeddings.errors import EmbeddingBlockedError
from brh_core.models import RetrievedChunk, VectorRecord
from brh_core.vectorstore.pinecone_integrated import _dict, flat_metadata

# Decimal MB, with headroom for SDK serialization/envelope differences.
MAX_PAYLOAD_BYTES = 1_900_000
MAX_METADATA_BYTES = 40_000


def validate_raw_index(description: dict, dimension: int) -> None:
    """Reject integrated, sparse, ambiguous, or incompatible raw indexes."""
    fields = (description.get("schema") or {}).get("fields", {})
    if description.get("embed") or any(
        field.get("type") == "semantic_text" for field in fields.values()
    ):
        raise ValueError("Pinecone client vectors require a non-integrated index")
    if fields:
        # SDK 10 describes legacy raw-vector indexes through Documents schemas.
        # _sparse_values is an optional companion, not a second dense target;
        # /vectors/upsert values and /query vector address the reserved _values.
        vectors = {
            name: field
            for name, field in fields.items()
            if field.get("type") in ("dense_vector", "sparse_vector")
        }
        dense = vectors.get("_values")
        companion = vectors.get("_sparse_values")
        if (
            dense is None
            or dense.get("type") != "dense_vector"
            or set(vectors) - {"_values", "_sparse_values"}
            or (companion is not None and companion.get("type") != "sparse_vector")
        ):
            raise ValueError("Pinecone client vectors require a single dense raw field (_values)")
        shape = dense
        # SDK legacy accessors should agree with the reserved dense field.
        for key, expected in (
            ("vector_type", "dense"),
            ("metric", "cosine"),
            ("dimension", dimension),
        ):
            if key in description and description[key] != expected:
                raise ValueError(f"Pinecone index {key} does not match {expected!r}")
    else:
        if description.get("vector_type") != "dense":
            raise ValueError("Pinecone client vectors require a dense index")
        shape = description
    if shape.get("metric") != "cosine":
        raise ValueError("Pinecone client vectors require cosine metric")
    if shape.get("dimension") != dimension:
        raise ValueError(
            f"Pinecone index dimension {shape.get('dimension')!r} does not match {dimension}"
        )


class PineconeClientVectorStore:
    """Embed passages locally and persist raw vectors with source metadata."""

    requires_exact_tokens = True

    def __init__(
        self,
        *,
        api_key: str,
        index_name: str,
        embedder: Embedder,
        namespace: str = "default",
        text_field: str = "chunk_text",
        batch_size: int = 96,
        timeout: float = 30,
        max_retries: int = 3,
        verify_attempts: int = 6,
        client: Any | None = None,
    ) -> None:
        if not 1 <= batch_size <= 96:
            raise ValueError("Pinecone batches must contain 1..96 vectors")
        if timeout <= 0 or not math.isfinite(timeout):
            raise ValueError("timeout must be positive and finite")
        if max_retries < 0 or verify_attempts < 1:
            raise ValueError("max_retries must be nonnegative and verify_attempts positive")
        if embedder.dimension < 1:
            raise ValueError("embedder dimension must be positive")
        if not text_field or text_field.startswith("_"):
            raise ValueError("text_field must be a non-reserved metadata field")
        if client is None:
            if not api_key:
                raise ValueError("BRH_PINECONE_API_KEY is required")
            from pinecone import Pinecone

            client = Pinecone(api_key=api_key)
        self._embedder = embedder
        self._dimension = embedder.dimension
        self._namespace = namespace
        self._text_field = text_field
        self._timeout = timeout
        self._retries = max_retries
        self._batch = batch_size
        self._verify_attempts = verify_attempts
        # Control-plane describe_index has no per-call timeout in SDK 10.
        description = _dict(self._call(lambda **_: client.describe_index(index_name)))
        validate_raw_index(description, self._dimension)
        if not description.get("host"):
            raise ValueError("Pinecone index has no serving host")
        self._index = client.Index(host=description["host"])
        self.target_id = (
            f"pinecone-vectors:{description['host']}:{namespace}:{self._dimension}:{text_field}"
        )

    def _call(self, function, **kwargs):
        for attempt in range(self._retries + 1):
            try:
                return function(**kwargs, timeout=self._timeout)
            except Exception as exc:
                status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
                detail = (
                    f"{exc} {getattr(exc, 'body', '')} {getattr(exc, 'error_code', '')}".lower()
                )
                hard_quota = any(
                    term in detail
                    for term in (
                        "quota",
                        "payment required",
                        "billing",
                        "exhausted",
                        "plan limit",
                        "upgrade your plan",
                        "current plan",
                        "monthly limit",
                    )
                )
                transient = status in (408, 429, 500, 502, 503, 504) or isinstance(
                    exc,
                    (TimeoutError, ConnectionError, PineconeConnectionError, PineconeTimeoutError),
                )
                if hard_quota or status in (401, 402, 403):
                    # Provider bodies may contain credentials or document content.
                    # This exception stops scheduling the worker's remaining documents.
                    raise EmbeddingBlockedError(
                        "Pinecone access blocked by authentication or quota; intervention required"
                    ) from None
                if not transient or attempt == self._retries:
                    raise
                time.sleep(self._retry_delay(exc, attempt))

    @staticmethod
    def _retry_delay(exc: Exception, attempt: int) -> float:
        """Honor SDK Retry-After headers, otherwise use full-jitter backoff."""
        headers = getattr(exc, "headers", None)
        if isinstance(headers, Mapping):
            retry_after = next(
                (value for key, value in headers.items() if str(key).lower() == "retry-after"),
                None,
            )
            if retry_after is not None:
                try:
                    delay = float(retry_after)
                except (TypeError, ValueError, OverflowError):
                    try:
                        delay = parsedate_to_datetime(str(retry_after)).timestamp() - time.time()
                    except (TypeError, ValueError, OverflowError):
                        delay = math.nan
                if math.isfinite(delay):
                    return max(0.0, min(delay, 30.0))
        return random.uniform(0, min(0.5 * 2 ** min(attempt, 6), 30))

    def _vector(self, values: Sequence[float]) -> list[float]:
        if len(values) != self._dimension:
            raise ValueError("embedder returned a vector with the wrong dimension")
        try:
            vector = [float(value) for value in values]
        except (TypeError, ValueError, OverflowError) as exc:
            raise ValueError("embedder returned a non-numeric vector") from exc
        if not all(math.isfinite(value) for value in vector):
            raise ValueError("embedder returned a non-finite vector")
        return vector

    def _metadata(self, record: VectorRecord) -> dict:
        return {**flat_metadata(record.metadata), self._text_field: record.text}

    def _payload_size(self, vectors: list[dict]) -> int:
        # Default separators and ASCII escaping overestimate the SDK's compact JSON.
        return len(
            json.dumps({"vectors": vectors, "namespace": self._namespace}, allow_nan=False).encode(
                "utf-8"
            )
        )

    def upsert(self, records: Sequence[VectorRecord]) -> int:
        # Preflight the entire document before any paid embedding request or write.
        metadata = []
        for record in records:
            if not record.text.strip():
                raise ValueError("Cannot embed empty chunk")
            projected = self._metadata(record)
            size = len(json.dumps(projected, allow_nan=False).encode("utf-8"))
            if size > MAX_METADATA_BYTES:
                raise ValueError(
                    f"Chunk {record.id!r} metadata is {size} serialized bytes; "
                    f"Pinecone limit is {MAX_METADATA_BYTES} bytes including "
                    f"{self._text_field!r}. Reduce chunk text or metadata before retrying."
                )
            metadata.append(projected)
        stream_batches = getattr(self._embedder, "embed_document_batches", None)
        for offset in range(0, len(records), self._batch):
            group = records[offset : offset + self._batch]
            texts = [record.text for record in group]
            if callable(stream_batches):
                batches = stream_batches(texts)
            else:
                vectors = self._embedder.embed_documents(texts)
                if len(vectors) != len(group):
                    raise ValueError("embedder returned a different number of vectors")
                batches = (vectors,)
            consumed = 0
            for vectors in batches:
                end = consumed + len(vectors)
                if not vectors or end > len(group):
                    raise ValueError(
                        "embedder returned an invalid number of vectors: "
                        "empty or oversized microbatch"
                    )
                # Persist this successful provider request before advancing the
                # iterator, so reconciliation can reuse it after a later failure.
                self._upsert_vectors(
                    group[consumed:end], vectors, metadata[offset + consumed : offset + end]
                )
                consumed = end
            if consumed != len(group):
                raise ValueError("embedder returned a different number of vectors")
        return len(records)

    def _upsert_vectors(
        self,
        records: Sequence[VectorRecord],
        vectors: Sequence[Sequence[float]],
        metadata: Sequence[dict],
    ) -> None:
        prepared = [
            {"id": record.id, "values": self._vector(vector), "metadata": projected}
            for record, vector, projected in zip(records, vectors, metadata, strict=True)
        ]
        envelope_size = self._payload_size([])
        sizes = [len(json.dumps(item, allow_nan=False).encode("utf-8")) for item in prepared]
        if any(envelope_size + size >= MAX_PAYLOAD_BYTES for size in sizes):
            raise ValueError("Single vector exceeds the Pinecone payload size limit")
        payload = []
        payload_size = envelope_size
        for item, size in zip(prepared, sizes, strict=True):
            separator_size = 2 if payload else 0
            if payload and payload_size + separator_size + size >= MAX_PAYLOAD_BYTES:
                self._call(self._index.upsert, vectors=payload, namespace=self._namespace)
                payload = []
                payload_size = envelope_size
                separator_size = 0
            payload.append(item)
            payload_size += separator_size + size
        if payload:
            self._call(self._index.upsert, vectors=payload, namespace=self._namespace)

    def search(self, query: str, *, top_k: int = 6, filter: dict | None = None):
        if not query.strip() or top_k <= 0:
            return []
        response = _dict(
            self._call(
                self._index.query,
                namespace=self._namespace,
                top_k=top_k,
                vector=self._vector(self._embedder.embed_query(query)),
                filter=filter,
                include_metadata=True,
                include_values=False,
            )
        )
        hits = []
        for match in response.get("matches") or []:
            match = _dict(match)
            metadata = dict(match.get("metadata") or {})
            text = metadata.pop(self._text_field, "")
            if not text or not metadata.get("document_id") or not metadata.get("page_number"):
                continue
            hits.append(
                RetrievedChunk(
                    chunk_id=match["id"],
                    score=match.get("score", 0),
                    text=text,
                    document_id=metadata["document_id"],
                    page_number=int(metadata["page_number"]),
                    metadata=metadata,
                )
            )
        return hits

    def count(self) -> int:
        stats = _dict(self._call(self._index.describe_index_stats))
        namespace = stats.get("namespaces", {}).get(self._namespace, {})
        return int(namespace.get("vector_count", 0))

    def list_ids(self, prefix: str) -> list[str]:
        ids = []
        token = None
        while True:
            page = _dict(
                self._call(
                    self._index.list_paginated,
                    namespace=self._namespace,
                    prefix=prefix,
                    limit=100,
                    pagination_token=token,
                )
            )
            ids.extend(_dict(item)["id"] for item in page.get("vectors", []))
            token = (page.get("pagination") or {}).get("next")
            if token is None:
                return ids

    def _fetch(self, ids: Sequence[str]) -> dict:
        fetched = {}
        for offset in range(0, len(ids), self._batch):
            response = _dict(
                self._call(
                    self._index.fetch,
                    namespace=self._namespace,
                    ids=list(ids[offset : offset + self._batch]),
                )
            )
            fetched.update(response.get("vectors", {}))
        return fetched

    def matching_ids(self, records: Sequence[VectorRecord]) -> set[str]:
        fetched = self._fetch([record.id for record in records])
        matched = set()
        for record in records:
            if record.id not in fetched:
                continue
            metadata = _dict(fetched[record.id]).get("metadata") or {}
            if all(metadata.get(key) == value for key, value in self._metadata(record).items()):
                matched.add(record.id)
        return matched

    def verify(self, records: Sequence[VectorRecord], *, absent_ids: Sequence[str] = ()) -> None:
        desired = {record.id for record in records}
        for attempt in range(self._verify_attempts):
            if self.matching_ids(records) == desired and not self._fetch(absent_ids):
                return
            if attempt + 1 < self._verify_attempts:
                time.sleep(min(0.5 * 2**attempt, 8))
        raise RuntimeError("Pinecone vectors have not converged; indexing remains retryable")

    def delete(self, ids: Sequence[str]) -> int:
        for offset in range(0, len(ids), self._batch):
            self._call(
                self._index.delete,
                namespace=self._namespace,
                ids=list(ids[offset : offset + self._batch]),
            )
        return len(ids)
