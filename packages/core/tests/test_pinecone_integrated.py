"""Contract tests for Pinecone's hosted embedding boundary."""

from __future__ import annotations

from brh_core.models import VectorRecord
from brh_core.vectorstore.pinecone_store import PineconeIntegratedVectorStore


class FakeDocuments:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def search(self, **kwargs):
        self.calls.append(kwargs)
        return {
            "result": {
                "hits": [
                    {
                        "_id": "chunk-1",
                        "_score": 0.91,
                        "fields": {
                            "chunk_text": "Texte BRH",
                            "document_id": "doc-1",
                            "page_number": 3,
                        },
                    }
                ]
            }
        }


class FakeIndex:
    def __init__(self) -> None:
        self.documents = FakeDocuments()
        self.upserted: list[tuple[str, list[dict]]] = []
        self.deleted: list[tuple[list[str], str]] = []

    def upsert_records(self, namespace: str, records: list[dict]) -> None:
        self.upserted.append((namespace, records))

    def delete(self, *, ids: list[str], namespace: str) -> None:
        self.deleted.append((ids, namespace))

    def describe_index_stats(self):
        return {"namespaces": {"brh": {"record_count": 4}}}


class FakeClient:
    def __init__(self, index: FakeIndex) -> None:
        self.index = index

    def Index(self, *args, **kwargs):
        return self.index


def test_integrated_pinecone_uses_hosted_embedding_and_langchain_retriever() -> None:
    index = FakeIndex()
    store = PineconeIntegratedVectorStore(
        api_key="unused-in-test",
        index_name="brh",
        namespace="brh",
        client=FakeClient(index),
    )

    assert store.upsert(
        [
            VectorRecord(
                id="chunk-1",
                text="Texte BRH",
                metadata={
                    "document_id": "doc-1",
                    "page_number": 3,
                    "section_path": ["Économie"],
                    "ignored": {"nested": True},
                },
            )
        ]
    ) == 1
    assert index.upserted == [
        (
            "brh",
            [
                {
                    "_id": "chunk-1",
                    "chunk_text": "Texte BRH",
                    "document_id": "doc-1",
                    "page_number": 3,
                    "section_path": ["Économie"],
                }
            ],
        )
    ]

    retriever = store.as_retriever(top_k=2, metadata_filter={"document_id": "doc-1"})
    documents = retriever.invoke("inflation")

    assert documents[0].id == "chunk-1"
    assert documents[0].page_content == "Texte BRH"
    assert documents[0].metadata["score"] == 0.91
    assert index.documents.calls[0]["score_by"][0]["type"] == "embed"
    assert index.documents.calls[0]["filter"] == {"document_id": "doc-1"}
    assert store.count() == 4
