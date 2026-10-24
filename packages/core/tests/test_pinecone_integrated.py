"""Records API contracts, hosted embedding payloads and remote failure behavior."""

from __future__ import annotations

import pytest
from brh_core.models import VectorRecord
from brh_core.vectorstore.pinecone_integrated import PineconeIntegratedVectorStore
from pinecone import Hit


class FakeIndex:
    def __init__(self):
        self.records = {}
        self.calls = []
        self.fail_upsert = 0
        self.fail_delete = 0

    def upsert_records(self, *, namespace, records, timeout):
        self.calls.append(("upsert", namespace, records))
        self.records.update({record["_id"]: dict(record) for record in records})
        if self.fail_upsert:
            self.fail_upsert -= 1
            raise RuntimeError("connection lost after the server accepted the batch")

    def search(self, *, namespace, top_k, inputs, filter, timeout):
        self.calls.append(("search", namespace, inputs))
        return {
            "result": {
                "hits": [
                    {"_id": key, "_score": 0.91, "fields": value}
                    for key, value in self.records.items()
                    if not filter or all(value.get(k) == v for k, v in filter.items())
                ][:top_k]
            }
        }

    def fetch(self, *, namespace, ids, timeout):
        return {
            "vectors": {
                key: {"metadata": value} for key, value in self.records.items() if key in ids
            }
        }

    def list(self, *, prefix, namespace, timeout):
        yield {"vectors": [{"id": key} for key in self.records if key.startswith(prefix)]}

    def delete(self, *, namespace, ids, timeout):
        if self.fail_delete:
            self.fail_delete -= 1
            raise RuntimeError("delete interrupted")
        for key in ids:
            self.records.pop(key, None)

    def describe_index_stats(self, *, timeout):
        return {"namespaces": {"brh": {"vector_count": len(self.records)}}}


class FakeClient:
    def __init__(self, index, model="multilingual-e5-large", text_field="chunk_text"):
        self.index = index
        self.model = model
        self.text_field = text_field

    def describe_index(self, name):
        return {
            "host": "brh.example.pinecone.io",
            "embed": {"model": self.model, "field_map": {"text": self.text_field}},
        }

    def Index(self, *, host):
        return self.index


def make_store(index=None, **kwargs):
    index = index or FakeIndex()
    return PineconeIntegratedVectorStore(
        api_key="test",
        index_name="brh",
        namespace="brh",
        client=FakeClient(index),
        verify_attempts=1,
        **kwargs,
    )


def test_integrated_records_api_and_langchain_retriever():
    index = FakeIndex()
    store = make_store(index)
    record = VectorRecord(
        id="doc:chunk",
        text="Texte BRH",
        metadata={
            "document_id": "doc",
            "page_number": 3,
            "index_version": "v1",
            "section_path": ["Économie"],
            "ignored": {"nested": True},
            "_id": "overwrite-attempt",
            "chunk_text": "overwrite-attempt",
        },
    )
    assert store.upsert([record]) == 1
    assert index.records["doc:chunk"]["chunk_text"] == "Texte BRH"
    assert "ignored" not in index.records["doc:chunk"]
    assert "_id" in index.records["doc:chunk"]
    documents = store.as_retriever(top_k=2).invoke("inflation")
    assert documents[0].id == "doc:chunk"
    assert documents[0].page_content == "Texte BRH"
    assert documents[0].metadata["score"] == 0.91
    assert store.list_ids("doc:") == ["doc:chunk"]
    assert store.count() == 1
    store.verify([record])
    assert store.delete(["doc:chunk"]) == 1
    store.verify([], absent_ids=["doc:chunk"])


def test_batches_never_exceed_the_hosted_model_limit():
    index = FakeIndex()
    store = make_store(index)
    records = [VectorRecord(id=f"d:{i}", text="Texte") for i in range(193)]
    assert store.upsert(records) == 193
    assert [len(call[2]) for call in index.calls] == [96, 96, 1]


def test_real_sdk_hit_serialization_is_supported(monkeypatch):
    index = FakeIndex()
    store = make_store(index)
    hit = Hit(
        id_="doc:1",
        score_=0.75,
        fields={
            "chunk_text": "Texte BRH",
            "document_id": "doc",
            "page_number": 1,
        },
    )
    monkeypatch.setattr(index, "search", lambda **kwargs: {"result": {"hits": [hit.to_dict()]}})
    result = store.search("BRH")
    assert result[0].chunk_id == "doc:1"
    assert result[0].score == 0.75


def test_wrong_hosted_model_is_rejected():
    with pytest.raises(ValueError, match="does not match"):
        PineconeIntegratedVectorStore(
            api_key="test", index_name="brh", client=FakeClient(FakeIndex(), model="wrong")
        )


def test_missing_or_wrong_remote_version_cannot_pass_verification():
    store = make_store()
    with pytest.raises(RuntimeError, match="not converged"):
        store.verify([VectorRecord(id="d:1", text="Texte", metadata={"index_version": "v1"})])


def test_transient_remote_failure_is_retried_but_bad_request_is_not(monkeypatch):
    monkeypatch.setattr("brh_core.vectorstore.pinecone_integrated.time.sleep", lambda _: None)
    store = make_store()
    calls = []

    class RateLimit(Exception):
        status = 429

    def operation(**kwargs):
        calls.append(kwargs)
        if len(calls) < 3:
            raise RateLimit()
        return "ok"

    assert store._call(operation) == "ok"
    assert len(calls) == 3
