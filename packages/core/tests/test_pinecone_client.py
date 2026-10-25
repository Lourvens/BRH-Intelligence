"""Offline contracts for raw Pinecone vectors and SDK 10 pagination."""

from __future__ import annotations

import json

import pytest
from brh_core.config import Settings
from brh_core.embeddings.errors import EmbeddingBlockedError
from brh_core.models import VectorRecord
from brh_core.vectorstore.base import VectorStore
from brh_core.vectorstore.pinecone_client import (
    MAX_METADATA_BYTES,
    MAX_PAYLOAD_BYTES,
    PineconeClientVectorStore,
)
from brh_core.vectorstore.pinecone_store import PineconeClientVectorStore as ExportedStore
from brh_core.vectorstore.provision import provision_index
from pinecone import ApiError, Index, ListResponse
from pinecone.models.indexes.deployment import ManagedDeployment
from pinecone.models.indexes.index import IndexModel, IndexStatus
from pinecone.models.indexes.schema import DenseVectorField, IndexSchema
from pinecone.models.vectors.responses import ListItem, Pagination


class FakeEmbedder:
    dimension = 3

    def __init__(self):
        self.documents = []
        self.queries = []
        self.vector = [0.25, 0.5, 0.75]

    def embed_documents(self, texts):
        self.documents.append(list(texts))
        return [list(self.vector) for _ in texts]

    def embed_query(self, text):
        self.queries.append(text)
        return list(self.vector)


class FakeIndex:
    def __init__(self):
        self.records = {}
        self.calls = []
        self.page_tokens = []
        self.fail_page = False

    def upsert(self, *, vectors, namespace, timeout):
        self.calls.append(("upsert", namespace, vectors))
        self.records.update({item["id"]: item for item in vectors})
        return {"upserted_count": len(vectors)}

    def query(self, *, top_k, vector, namespace, filter, include_metadata, include_values, timeout):
        assert vector == [0.25, 0.5, 0.75]
        assert include_metadata is True and include_values is False
        self.calls.append(("query", namespace, filter))
        return {
            "matches": [
                {"id": key, "score": 0.9, "metadata": item["metadata"]}
                for key, item in self.records.items()
                if not filter or all(item["metadata"].get(k) == v for k, v in filter.items())
            ][:top_k]
        }

    def fetch(self, *, ids, namespace, timeout):
        self.calls.append(("fetch", namespace, ids))
        return {"vectors": {key: self.records[key] for key in ids if key in self.records}}

    def list_paginated(self, *, prefix, limit, pagination_token, namespace, timeout):
        assert limit == 100
        self.page_tokens.append(pagination_token)
        if pagination_token == "page-2" and self.fail_page:
            self.fail_page = False
            raise ApiError("try again", 503)
        ids = sorted(key for key in self.records if key.startswith(prefix))
        if pagination_token is None:
            return ListResponse(
                vectors=[ListItem(id=key) for key in ids[:1]], pagination=Pagination(next="empty")
            )
        if pagination_token == "empty":
            return ListResponse(pagination=Pagination(next="page-2"))
        return ListResponse(vectors=[ListItem(id=key) for key in ids[1:]])

    def delete(self, *, ids, namespace, timeout):
        self.calls.append(("delete", namespace, ids))
        for key in ids:
            self.records.pop(key, None)

    def describe_index_stats(self, *, timeout):
        return {"namespaces": {"brh": {"vector_count": len(self.records)}}}


class FakeClient:
    def __init__(self, index=None, **description):
        self.index = index or FakeIndex()
        self.description = {
            "host": "brh.example.pinecone.io",
            "dimension": 3,
            "metric": "cosine",
            "vector_type": "dense",
            **description,
        }
        self.created = []
        self.exists = True

    def describe_index(self, name):
        assert name == "brh"
        return self.description

    def Index(self, *, host):
        assert host == "brh.example.pinecone.io" or host == "https://brh.example.pinecone.io"
        return self.index

    def has_index(self, name):
        return self.exists

    def create_index(self, **kwargs):
        self.created.append(("raw", kwargs))

    def create_index_for_model(self, **kwargs):
        self.created.append(("integrated", kwargs))


def make_store(client=None, **kwargs):
    return PineconeClientVectorStore(
        api_key="test",
        index_name="brh",
        embedder=kwargs.pop("embedder", FakeEmbedder()),
        client=client or FakeClient(),
        namespace="brh",
        verify_attempts=kwargs.pop("verify_attempts", 1),
        **kwargs,
    )


def record(id="d:1", **metadata):
    return VectorRecord(
        id=id,
        text="Texte BRH — économie",
        metadata={
            "document_id": "d",
            "page_number": 2,
            "index_version": "v1",
            **metadata,
        },
    )


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr("brh_core.vectorstore.pinecone_client.time.sleep", lambda _: None)


def test_metadata_search_reconciliation_and_stable_export():
    client = FakeClient()
    store = make_store(client, text_field="passage")
    assert isinstance(store, VectorStore)
    assert store.requires_exact_tokens is True
    assert ExportedStore is PineconeClientVectorStore
    desired = record(
        passage="spoof",
        section_path=["Économie"],
        nested={"x": 1},
        _private="hidden",
        invalid=float("nan"),
        published=True,
    )
    assert store.upsert([desired]) == 1
    saved = client.index.records[desired.id]["metadata"]
    assert saved["passage"] == desired.text
    assert saved["section_path"] == ["Économie"]
    assert saved["published"] is True
    assert not {"nested", "_private", "invalid"} & saved.keys()
    hit = store.search("inflation", filter={"document_id": "d"})[0]
    assert (hit.chunk_id, hit.text, hit.page_number, hit.score) == ("d:1", desired.text, 2, 0.9)
    assert "passage" not in hit.metadata
    assert store.search("inflation", filter={"document_id": "other"}) == []
    assert store.count() == 1
    assert store.matching_ids([desired]) == {desired.id}
    store.verify([desired])
    assert store.delete([desired.id, "absent"]) == 2
    store.verify([], absent_ids=[desired.id])
    assert store.count() == 0


def test_pagination_retries_only_failed_page_and_keeps_empty_page_token():
    client = FakeClient()
    store = make_store(client)
    store.upsert([record("d:1"), record("d:2"), record("other:1")])
    client.index.fail_page = True
    assert store.list_ids("d:") == ["d:1", "d:2"]
    assert client.index.page_tokens == [None, "empty", "page-2", "page-2"]
    # Installed SDK 10 list() yields ListResponse pages, not lists of strings.
    pages = list(Index.list(client.index, prefix="d:", limit=100, namespace="brh"))
    assert all(isinstance(page, ListResponse) for page in pages)
    assert [item.id for page in pages for item in page.vectors] == ["d:1", "d:2"]


def test_upsert_fetch_delete_batches_and_empty_operations():
    client = FakeClient()
    store = make_store(client)
    records = [record(f"d:{i}") for i in range(193)]
    assert store.upsert(records) == 193
    assert [len(call[2]) for call in client.index.calls] == [96, 96, 1]
    assert [len(group) for group in store._embedder.documents] == [96, 96, 1]
    assert len(store.matching_ids(records)) == 193
    store.delete([item.id for item in records])
    for operation in ("fetch", "delete"):
        assert [len(c[2]) for c in client.index.calls if c[0] == operation] == [96, 96, 1]
    client.index.calls.clear()
    assert store.upsert([]) == store.delete([]) == 0
    assert store.matching_ids([]) == set()
    store.verify([])
    assert store.search(" ") == store.search("x", top_k=0) == []
    assert not client.index.calls


def test_upsert_payload_bound_includes_vectors_text_metadata_and_namespace(monkeypatch):
    client = FakeClient(dimension=4096)
    embedder = FakeEmbedder()
    embedder.dimension = 4096
    embedder.vector = [0.12345678901234567] * 4096
    store = make_store(client, embedder=embedder)
    # Wide vectors trigger splitting while each record has writable metadata.
    records = [
        VectorRecord(id=str(i), text="é" * 200, metadata={"extra": "é" * 200}) for i in range(48)
    ]
    store.upsert(records)
    calls = [call for call in client.index.calls if call[0] == "upsert"]
    assert len(calls) > 1
    assert sum(len(call[2]) for call in calls) == 48
    for _, namespace, payload in calls:
        size = len(json.dumps({"vectors": payload, "namespace": namespace}).encode())
        assert size < MAX_PAYLOAD_BYTES < 2_000_000
    before = len(calls)
    monkeypatch.setattr("brh_core.vectorstore.pinecone_client.MAX_PAYLOAD_BYTES", 100)
    with pytest.raises(ValueError, match="Single vector"):
        store.upsert([record()])
    assert len([c for c in client.index.calls if c[0] == "upsert"]) == before


@pytest.mark.parametrize(
    "description, error",
    [
        ({"dimension": 4}, "dimension"),
        ({"metric": "dotproduct"}, "cosine"),
        ({"vector_type": "sparse"}, "dense"),
        ({"embed": {"model": "hosted"}}, "non-integrated"),
        ({"schema": {"fields": {"text": {"type": "semantic_text"}}}}, "non-integrated"),
        (
            {"schema": {"fields": {"a": {"type": "dense_vector"}, "b": {"type": "dense_vector"}}}},
            "single dense",
        ),
    ],
)
def test_incompatible_index_rejected(description, error):
    with pytest.raises(ValueError, match=error):
        make_store(FakeClient(**description))


def test_real_sdk_10_index_schema():
    model = IndexModel(
        name="brh",
        status=IndexStatus(ready=True, state="Ready"),
        schema=IndexSchema(fields={"_values": DenseVectorField(dimension=3, metric="cosine")}),
        deployment=ManagedDeployment(cloud="aws", region="us-east-1"),
        deletion_protection="enabled",
        host="brh.example.pinecone.io",
    )
    client = FakeClient()
    client.description = model
    make_store(client)
    assert model.to_dict()["dimension"] == 3


@pytest.mark.parametrize(
    "vector, error",
    [
        ([1, 2], "dimension"),
        ([1, float("nan"), 0], "non-finite"),
        ([1, float("inf"), 0], "non-finite"),
        ([1, "bad", 0], "non-numeric"),
    ],
)
def test_document_and_query_vector_validation(vector, error):
    embedder = FakeEmbedder()
    embedder.vector = vector
    client = FakeClient()
    store = make_store(client, embedder=embedder)
    with pytest.raises(ValueError, match=error):
        store.upsert([record()])
    with pytest.raises(ValueError, match=error):
        store.search("query")
    assert client.index.calls == []


def test_document_vector_count_and_empty_text_rejected():
    embedder = FakeEmbedder()
    embedder.embed_documents = lambda texts: []
    store = make_store(embedder=embedder)
    with pytest.raises(ValueError, match="number of vectors"):
        store.upsert([record()])
    with pytest.raises(ValueError, match="empty"):
        store.upsert([VectorRecord(id="empty", text=" ")])


@pytest.mark.parametrize(
    "status, message, attempts",
    [
        (429, "rate limit per second", 4),
        (503, "unavailable", 4),
        (401, "unauthorized", 1),
        (403, "forbidden", 1),
        (400, "invalid", 1),
        (429, "monthly write unit limit exhausted", 1),
        (429, "QUOTA_EXCEEDED", 1),
        (429, "upgrade your plan", 1),
    ],
)
def test_retries_are_bounded_and_auth_hardquota_not_retried(status, message, attempts):
    store = make_store()
    calls = []

    def fail(*, timeout):
        calls.append(timeout)
        raise ApiError(message, status)

    blocked = status in (401, 402, 403) or (attempts == 1 and status == 429)
    with pytest.raises(EmbeddingBlockedError if blocked else ApiError):
        store._call(fail)
    assert calls == [30] * attempts


def test_transient_success_and_sdk_transport_retry():
    from pinecone.errors import PineconeConnectionError

    store = make_store()
    calls = []

    def operation(*, timeout):
        calls.append(timeout)
        if len(calls) == 1:
            raise PineconeConnectionError("connection lost")
        return "ok"

    assert store._call(operation) == "ok"
    assert len(calls) == 2


def test_verification_checks_text_versions_absence_and_eventual_visibility(monkeypatch):
    client = FakeClient()
    store = make_store(client, verify_attempts=3)
    desired = record()
    for incorrect in (record(index_version="old"), desired.model_copy(update={"text": "old"})):
        store.upsert([incorrect])
        assert store.matching_ids([desired]) == set()
        with pytest.raises(RuntimeError, match="not converged"):
            store.verify([desired])
    store.upsert([desired, record("stale")])
    with pytest.raises(RuntimeError, match="not converged"):
        store.verify([desired], absent_ids=["stale"])
    store.delete(["stale"])
    original_fetch = client.index.fetch
    attempts = []

    def delayed_fetch(**kwargs):
        attempts.append(kwargs)
        return {"vectors": {}} if len(attempts) < 3 else original_fetch(**kwargs)

    monkeypatch.setattr(client.index, "fetch", delayed_fetch)
    store.verify([desired], absent_ids=["stale"])
    assert len(attempts) == 4


@pytest.mark.parametrize("backend", ["pinecone", "pinecone_integrated"])
def test_provision_creation_and_preexisting_validation(monkeypatch, backend):
    client = FakeClient()
    monkeypatch.setattr("pinecone.Pinecone", lambda **kwargs: client)
    settings = Settings(
        _env_file=None,
        vector_backend=backend,
        embedding_dim=3,
        pinecone_index_name="brh",
        pinecone_api_key="test",
    )
    client.exists = False
    provision_index(settings, cloud="aws", region="us-east-1")
    kind, kwargs = client.created[0]
    assert kwargs["deletion_protection"] == "enabled"
    assert kwargs["timeout"] == 120
    if backend == "pinecone":
        assert kind == "raw"
        assert (kwargs["dimension"], kwargs["metric"], kwargs["vector_type"]) == (
            3,
            "cosine",
            "dense",
        )
        assert kwargs["spec"].cloud == "aws"
    else:
        assert kind == "integrated"
        assert kwargs["embed"]["write_parameters"]["truncate"] == "NONE"
        client.description["embed"] = {
            "model": settings.embedding_model,
            "field_map": {"text": settings.pinecone_text_field},
        }
    client.exists = True
    provision_index(settings)
    assert len(client.created) == 1
    client.description["dimension"] = 4
    with pytest.raises(ValueError, match="dimension"):
        provision_index(settings)


def test_provision_rejects_existing_wrong_model_and_raw_hosted_index(monkeypatch):
    client = FakeClient(embed={"model": "wrong"})
    monkeypatch.setattr("pinecone.Pinecone", lambda **kwargs: client)
    settings = Settings(
        _env_file=None,
        vector_backend="pinecone_integrated",
        pinecone_index_name="brh",
        embedding_dim=3,
    )
    with pytest.raises(ValueError, match="model"):
        provision_index(settings)
    with pytest.raises(ValueError, match="non-integrated"):
        provision_index(settings.model_copy(update={"vector_backend": "pinecone"}))


def test_sdk_query_fetch_and_namespace_stats_responses(monkeypatch):
    from pinecone import DescribeIndexStatsResponse, FetchResponse, QueryResponse, Vector
    from pinecone.models.vectors.responses import NamespaceSummary, ScoredVector

    client = FakeClient()
    store = make_store(client)
    desired = record()
    metadata = {**desired.metadata, "chunk_text": desired.text}
    monkeypatch.setattr(
        client.index,
        "query",
        lambda **kwargs: QueryResponse(
            matches=[
                ScoredVector(id=desired.id, score=0.82, metadata=metadata),
                ScoredVector(id="without-source", score=0.95, metadata={"chunk_text": "text"}),
            ]
        ),
    )
    monkeypatch.setattr(
        client.index,
        "fetch",
        lambda **kwargs: FetchResponse(
            vectors={
                desired.id: Vector(id=desired.id, values=[0.25, 0.5, 0.75], metadata=metadata),
            }
        ),
    )
    monkeypatch.setattr(
        client.index,
        "describe_index_stats",
        lambda **kwargs: DescribeIndexStatsResponse(
            namespaces={"other": NamespaceSummary(vector_count=20)}
        ),
    )
    assert store.matching_ids([desired]) == {desired.id}
    result = store.search("prix")
    assert len(result) == 1
    assert result[0].score == 0.82
    assert result[0].text == desired.text
    assert store.count() == 0


@pytest.mark.parametrize(
    "kwargs",
    [
        {"batch_size": 0},
        {"batch_size": 97},
        {"max_retries": -1},
        {"verify_attempts": 0},
        {"timeout": 0},
        {"timeout": float("inf")},
    ],
)
def test_invalid_constructor_bounds(kwargs):
    with pytest.raises(ValueError):
        make_store(**kwargs)


def test_batch_validation_precedes_writes(monkeypatch):
    client = FakeClient()
    embedder = FakeEmbedder()
    monkeypatch.setattr(embedder, "embed_documents", lambda texts: [[0, 1, 2], [0, 1]])
    store = make_store(client, embedder=embedder)
    with pytest.raises(ValueError, match="dimension"):
        store.upsert([record("d:1"), record("d:2")])
    assert client.index.calls == []


def test_successful_upsert_retry_reuses_embedded_vectors(monkeypatch):
    client = FakeClient()
    store = make_store(client)
    original_upsert = client.index.upsert
    attempts = []

    def accepted_then_lost(**kwargs):
        attempts.append(kwargs)
        result = original_upsert(**kwargs)
        if len(attempts) == 1:
            raise TimeoutError("response lost after write")
        return result

    monkeypatch.setattr(client.index, "upsert", accepted_then_lost)
    assert store.upsert([record()]) == 1
    assert len(attempts) == 2
    assert len(store._embedder.documents) == 1
    assert store.count() == 1
    store.verify([record()])


@pytest.mark.parametrize(
    "status, detail",
    [
        (401, "secret-api-key"),
        (403, "secret-api-key"),
        (402, "secret-api-key"),
        (429, "monthly quota secret-api-key"),
    ],
)
def test_permanent_failures_are_sanitized_worker_blockers(monkeypatch, status, detail):
    import traceback

    store = make_store()
    sleeps = []
    monkeypatch.setattr("brh_core.vectorstore.pinecone_client.time.sleep", sleeps.append)

    def fail(*, timeout):
        raise ApiError(detail, status, body={"error": detail}, headers={"Retry-After": "30"})

    with pytest.raises(EmbeddingBlockedError) as failure:
        store._call(fail)
    assert "secret-api-key" not in str(failure.value)
    assert "secret-api-key" not in "".join(traceback.format_exception(failure.value))
    assert failure.value.__suppress_context__ is True
    assert sleeps == []


@pytest.mark.parametrize(
    "header, expected",
    [
        ("2.5", 2.5),
        ("120", 30),
        ("-1", 0),
        ("0", 0),
        ("Thu, 01 Jan 1970 00:16:50 GMT", 10),
    ],
)
def test_retry_after_mapping_is_honored_and_bounded(monkeypatch, header, expected):
    from collections import UserDict

    store = make_store()
    sleeps = []
    monkeypatch.setattr("brh_core.vectorstore.pinecone_client.time.sleep", sleeps.append)
    monkeypatch.setattr("brh_core.vectorstore.pinecone_client.time.time", lambda: 1000)
    calls = []

    def operation(*, timeout):
        calls.append(timeout)
        if len(calls) == 1:
            exc = ApiError("transient", 429)
            exc.headers = UserDict({"rEtRy-AfTeR": header})
            raise exc
        return "ok"

    assert store._call(operation) == "ok"
    assert sleeps == [expected]


@pytest.mark.parametrize("header", [None, "bad header", "NaN", "inf"])
def test_invalid_or_missing_retry_after_uses_bounded_full_jitter(monkeypatch, header):
    store = make_store(max_retries=8)
    sleeps, ranges = [], []
    monkeypatch.setattr("brh_core.vectorstore.pinecone_client.time.sleep", sleeps.append)

    def jitter(low, high):
        ranges.append((low, high))
        return high / 2

    monkeypatch.setattr("brh_core.vectorstore.pinecone_client.random.uniform", jitter)

    def fail(*, timeout):
        raise ApiError("transient", 503, headers={"Retry-After": header} if header else None)

    with pytest.raises(ApiError):
        store._call(fail)
    assert ranges == [(0, cap) for cap in (0.5, 1, 2, 4, 8, 16, 30, 30)]
    assert sleeps == [cap / 2 for _, cap in ranges]
    assert all(0 <= delay <= 30 for delay in sleeps)


def test_sdk10_legacy_dense_index_with_sparse_companion_and_raw_wire(monkeypatch):
    """Mirror the live create_index(dimension=...) schema and exercise SDK encoding."""
    import httpx
    from pinecone.models.indexes.schema import SparseVectorField

    model = IndexModel(
        name="brh",
        status=IndexStatus(ready=True, state="Ready"),
        schema=IndexSchema(
            fields={
                "_sparse_values": SparseVectorField(),
                "_values": DenseVectorField(dimension=3, metric="cosine"),
            }
        ),
        deployment=ManagedDeployment(cloud="aws", region="us-east-1"),
        deletion_protection="enabled",
        host="brh.example.pinecone.io",
    )
    client = FakeClient()
    client.description = model
    sdk_index = Index(api_key="test", host="brh.example.pinecone.io")
    client.index = sdk_index
    calls = []
    desired = record()

    def post(path, *, timeout, json):
        calls.append((path, json))
        if path == "/vectors/upsert":
            return httpx.Response(200, json={"upsertedCount": 1})
        assert path == "/query"
        return httpx.Response(
            200,
            json={
                "matches": [
                    {
                        "id": desired.id,
                        "score": 0.9,
                        "metadata": {**desired.metadata, "chunk_text": desired.text},
                    }
                ]
            },
        )

    monkeypatch.setattr(sdk_index._http, "post", post)
    store = make_store(client)
    assert model.to_dict()["vector_type"] == "dense"
    assert store.upsert([desired]) == 1
    assert store.search("inflation")[0].text == desired.text
    assert calls[0] == (
        "/vectors/upsert",
        {
            "namespace": "brh",
            "vectors": [
                {
                    "id": desired.id,
                    "values": [0.25, 0.5, 0.75],
                    "metadata": {**desired.metadata, "chunk_text": desired.text},
                }
            ],
        },
    )
    assert calls[1][0] == "/query"
    assert calls[1][1]["vector"] == [0.25, 0.5, 0.75]
    assert "sparseVector" not in calls[1][1]
    sdk_index.close()


@pytest.mark.parametrize(
    "fields",
    [
        {"custom": {"type": "dense_vector", "dimension": 3, "metric": "cosine"}},
        {
            "_values": {"type": "dense_vector", "dimension": 3, "metric": "cosine"},
            "custom": {"type": "sparse_vector"},
        },
        {
            "_values": {"type": "dense_vector", "dimension": 3, "metric": "cosine"},
            "_sparse_values": {"type": "dense_vector", "dimension": 3, "metric": "cosine"},
        },
        {"_sparse_values": {"type": "sparse_vector"}},
    ],
)
def test_custom_document_vector_schemas_cannot_use_raw_api(fields):
    with pytest.raises(ValueError, match="single dense raw field"):
        make_store(FakeClient(schema={"fields": fields}))


@pytest.mark.parametrize(
    "dimension, metric, error",
    [
        (4, "cosine", "dimension"),
        (3, "dotproduct", "cosine"),
    ],
)
def test_reserved_dense_field_must_match_even_when_legacy_accessors_match(dimension, metric, error):
    with pytest.raises(ValueError, match=error):
        make_store(
            FakeClient(
                schema={
                    "fields": {
                        "_values": {
                            "type": "dense_vector",
                            "dimension": dimension,
                            "metric": metric,
                        },
                        "_sparse_values": {"type": "sparse_vector"},
                    }
                }
            )
        )


@pytest.mark.parametrize(
    "oversized",
    [
        VectorRecord(id="too-much-text", text="é" * 20_001),
        VectorRecord(id="too-much-metadata", text="ok", metadata={"extra": "x" * 40_001}),
    ],
)
def test_metadata_preflight_rejects_before_any_embedding_or_write(oversized):
    client = FakeClient()
    store = make_store(client, batch_size=1)
    # A late unwritable chunk must also prevent paying for earlier valid batches.
    with pytest.raises(ValueError, match="Reduce chunk text or metadata") as error:
        store.upsert([record(), oversized])
    assert oversized.id in str(error.value)
    assert "40000" in str(error.value)
    assert store._embedder.documents == []
    assert client.index.calls == []


@pytest.mark.parametrize(
    "size, accepted", [(MAX_METADATA_BYTES, True), (MAX_METADATA_BYTES + 1, False)]
)
def test_metadata_limit_includes_text_field_and_serialized_envelope(size, accepted):
    client = FakeClient()
    store = make_store(client)
    envelope = len(json.dumps({"chunk_text": ""}).encode("utf-8"))
    desired = VectorRecord(id="boundary", text="x" * (size - envelope))
    if accepted:
        assert store.upsert([desired]) == 1
        saved = client.index.records[desired.id]["metadata"]
        assert len(json.dumps(saved).encode("utf-8")) == MAX_METADATA_BYTES
    else:
        with pytest.raises(ValueError, match="metadata is 40001 serialized bytes"):
            store.upsert([desired])
        assert store._embedder.documents == []


def test_streaming_embeddings_persist_before_next_request_and_resume_reuses_partial_writes():
    from brh_core.db.index_manifest import MemoryIndexLedger
    from brh_core.ingestion.indexing import IndexCoordinator

    client = FakeClient()

    class StreamingEmbedder(FakeEmbedder):
        fail_once = True

        def embed_documents(self, texts):
            pytest.fail("Streaming embedder must use embed_document_batches")

        def embed_document_batches(self, texts):
            self.documents.append(list(texts))
            for offset in range(0, len(texts), 32):
                if self.fail_once and offset == 64:
                    self.fail_once = False
                    raise RuntimeError("third provider request failed")
                batch = texts[offset : offset + 32]
                yield [list(self.vector) for _ in batch]
                # Executed only when the consumer requests the next provider batch.
                saved_texts = {
                    item["metadata"]["chunk_text"] for item in client.index.records.values()
                }
                assert set(batch) <= saved_texts

    embedder = StreamingEmbedder()
    store = make_store(client, embedder=embedder)
    ledger = MemoryIndexLedger()
    coordinator = IndexCoordinator(store, ledger, store.target_id)
    records = [record(f"d:{i}").model_copy(update={"text": f"Texte {i}"}) for i in range(96)]
    with pytest.raises(RuntimeError, match="third provider request failed"):
        coordinator.reconcile("d", "version-1", records)
    assert len(client.index.records) == 64
    # The outer 96-record manifest batch has not checkpointed, but remote versions have.
    assert ledger.load(store.target_id, "d").written_ids == []
    assert ledger.load(store.target_id, "d").status == "failed"
    result = coordinator.reconcile("d", "version-1", records)
    assert result["vectors_reused"] == 64
    assert result["vectors_written"] == 32
    assert embedder.documents[1] == [item.text for item in records[64:]]
    assert len(client.index.records) == 96
    assert ledger.load(store.target_id, "d").status == "succeeded"
    assert [len(call[2]) for call in client.index.calls if call[0] == "upsert"] == [32, 32, 32]


def test_streaming_offsets_preserve_vectors_metadata_and_outer_batch_boundaries():
    client = FakeClient()

    class StreamingEmbedder(FakeEmbedder):
        def embed_document_batches(self, texts):
            self.documents.append(list(texts))
            for text in texts:
                value = int(text)
                yield [[float(value), 0.5, 0.75]]
                assert client.index.records[f"d:{value}"]["metadata"]["chunk_text"] == text

    embedder = StreamingEmbedder()
    store = make_store(client, embedder=embedder, batch_size=3)
    records = [
        record(f"d:{i}", page_number=i + 1).model_copy(update={"text": str(i)}) for i in range(7)
    ]
    assert store.upsert(records) == 7
    assert [len(batch) for batch in embedder.documents] == [3, 3, 1]
    for i in range(7):
        saved = client.index.records[f"d:{i}"]
        assert saved["values"] == [float(i), 0.5, 0.75]
        assert saved["metadata"]["page_number"] == i + 1
    store.verify(records)


@pytest.mark.parametrize(
    "sizes, saved",
    [
        ([], 0),
        ([0], 0),
        ([4], 0),
        ([1], 1),
        ([2, 2], 2),
        ([1, 0], 1),
        ([3, 1], 3),
    ],
)
def test_streaming_rejects_missing_empty_or_oversized_microbatches(sizes, saved):
    client = FakeClient()

    class MalformedEmbedder(FakeEmbedder):
        def embed_document_batches(self, texts):
            for size in sizes:
                yield [list(self.vector) for _ in range(size)]

    store = make_store(client, embedder=MalformedEmbedder())
    with pytest.raises(ValueError, match="number of vectors"):
        store.upsert([record(f"d:{i}") for i in range(3)])
    assert len(client.index.records) == saved


def test_streaming_preflight_validates_whole_document_before_starting_generator():
    client = FakeClient()

    class StreamingEmbedder(FakeEmbedder):
        def embed_document_batches(self, texts):
            pytest.fail("Unwritable metadata must fail before starting paid requests")
            yield []

    store = make_store(client, embedder=StreamingEmbedder())
    with pytest.raises(ValueError, match="Reduce chunk text or metadata"):
        store.upsert([record(), VectorRecord(id="oversize", text="x" * 40_001)])
    assert client.index.calls == []
