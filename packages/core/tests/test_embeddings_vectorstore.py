"""Offline tests for the LangChain-compatible indexing boundary."""

from __future__ import annotations

from brh_core.embeddings.hashing import HashingEmbedder
from brh_core.ingestion.langchain import chunk_to_langchain_document
from brh_core.models import Chunk, ChunkType, Document, VectorRecord
from brh_core.vectorstore.memory import InMemoryVectorStore


def test_hashing_embedder_is_deterministic_and_normalized() -> None:
    embedder = HashingEmbedder(dimension=32)
    first = embedder.embed_query("Économie et inflation")
    second = embedder.embed_query("Économie et inflation")

    assert first == second
    assert len(first) == 32
    assert sum(value * value for value in first) == 1.0
    assert embedder.embed_documents([]) == []


def test_memory_store_is_idempotent_filterable_and_stable() -> None:
    store = InMemoryVectorStore(HashingEmbedder(dimension=64))
    records = [
        VectorRecord(
            id="b",
            text="inflation et prix",
            metadata={"document_id": "doc", "page_number": 2, "kind": "table"},
        ),
        VectorRecord(
            id="a",
            text="inflation et prix",
            metadata={"document_id": "doc", "page_number": 1, "kind": "prose"},
        ),
    ]

    assert store.upsert(records) == 2
    assert store.upsert(records[:1]) == 1
    assert store.count() == 2
    assert [hit.chunk_id for hit in store.search("inflation", top_k=2)] == ["a", "b"]
    assert [hit.chunk_id for hit in store.search("inflation", filter={"kind": "table"})] == [
        "b"
    ]
    assert store.delete(["b", "missing"]) == 1
    assert store.count() == 1


def test_chunk_projection_has_stable_flat_metadata() -> None:
    source = Document(
        document_id="doc-1",
        sha256="a" * 64,
        slug="rapport",
        title="Rapport",
    )
    chunk = Chunk(
        chunk_id="chunk-1",
        document_id=source.document_id,
        page_number=3,
        page_end=4,
        ordinal=0,
        text="Texte de preuve.",
        chunk_type=ChunkType.table,
        section_path=("Prix", "Indice"),
    )

    projected = chunk_to_langchain_document(
        chunk,
        source,
        chunker_id="hybrid-v2",
        tokenizer_id="safe-estimate-v2",
        embedding_id="hashing:64",
    )

    assert projected.id == "chunk-1"
    assert projected.page_content == chunk.text
    assert projected.metadata == {
        "document_id": "doc-1",
        "sha256": "a" * 64,
        "page_number": 3,
        "page_end": 4,
        "chunk_type": "table",
        "section_path": ["Prix", "Indice"],
        "chunker_id": "hybrid-v2",
        "tokenizer_id": "safe-estimate-v2",
        "embedding_id": "hashing:64",
    }
