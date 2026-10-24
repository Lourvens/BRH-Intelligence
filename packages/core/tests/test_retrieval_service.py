"""Canonical retrieval preserves table evidence and rejects stale index state."""

from hashlib import sha256

import pytest
from brh_core.config import Settings
from brh_core.embeddings.hashing import HashingEmbedder
from brh_core.ingestion.indexing import IndexCoordinator
from brh_core.models import Chunk, ChunkType, Document, VectorRecord
from brh_core.retrieval.service import RetrievalService
from brh_core.vectorstore.memory import InMemoryVectorStore
from test_ingestion_pipeline import FakeRepository


@pytest.fixture
def corpus():
    settings = Settings(_env_file=None, vector_backend="memory", embedding_provider="hashing")
    repository = FakeRepository()
    store = InMemoryVectorStore(HashingEmbedder(128))
    source = Document(
        document_id="doc",
        sha256="a" * 64,
        slug="rapport",
        title="Rapport",
        metadata={"content_key": "content"},
    )
    first = Chunk(
        chunk_id="doc:1",
        document_id="doc",
        page_number=2,
        page_end=3,
        ordinal=0,
        text="Inflation prix 2025",
        chunk_type=ChunkType.table,
        metadata={"table_id": "table-1", "next_chunk_id": "doc:2"},
    )
    second = Chunk(
        chunk_id="doc:2",
        document_id="doc",
        page_number=2,
        ordinal=1,
        text="Inflation prix 2026",
        chunk_type=ChunkType.table,
        metadata={"table_id": "table-1", "prev_chunk_id": "doc:1"},
    )
    prose = Chunk(
        chunk_id="doc:3", document_id="doc", page_number=1, ordinal=0, text="Croissance économique"
    )
    repository.replace_document_content(source, [], [first, second, prose])
    records = [
        VectorRecord(
            id=chunk.chunk_id,
            text=chunk.text,
            metadata={
                "document_id": "doc",
                "page_number": chunk.page_number,
                "sha256": source.sha256,
            },
        )
        for chunk in (first, second, prose)
    ]
    IndexCoordinator(store, repository.ledger, store.target_id).reconcile(
        "doc", "content:index", records
    )
    service = RetrievalService(settings, vector_store=store, repository=repository)
    return service, repository, store


def test_distinct_table_rows_on_one_page_survive_and_page_ranges_are_cited(corpus):
    service, _, _ = corpus
    result = service.search("inflation prix", top_k=2, min_score=0)
    assert {chunk.chunk_id for chunk in result.chunks} == {"doc:1", "doc:2"}
    assert {citation.page_number for citation in result.citations} == {2, 3}
    assert all(
        citation.pdf_url.endswith(f"#page={citation.page_number}") for citation in result.citations
    )


def test_context_expansion_is_bounded_and_filters_are_forwarded(corpus):
    service, _, _ = corpus
    result = service.search("inflation prix", top_k=1, min_score=0)
    assert len(result.chunks) == 2
    assert any("expanded_from" in hit.metadata for hit in result.chunks)
    filtered = service.search("croissance", min_score=0, filter={"page_number": 1})
    assert {chunk.chunk_id for chunk in filtered.chunks} == {"doc:3"}
    assert not service.search("inflation", min_score=2).grounded
    assert not service.search(" ").grounded


def test_pending_manifest_or_stale_text_is_never_served(corpus):
    service, repository, store = corpus
    state = repository.ledger.load(store.target_id, "doc")
    state.status = "failed"
    repository.ledger.save(store.target_id, "doc", state)
    assert not service.search("inflation", min_score=0).grounded
    state.status = "succeeded"
    repository.ledger.save(store.target_id, "doc", state)
    for key, record in store._records.items():
        store._records[key] = record.model_copy(update={"text": "Old stale text"})
    assert not service.search("inflation", min_score=0).grounded


def test_current_local_content_is_required_even_when_old_manifest_succeeded(corpus):
    service, repository, store = corpus
    document = repository.documents["doc"]
    repository.documents["doc"] = document.model_copy(
        update={"metadata": {"content_key": "new-content"}}
    )
    assert all(
        record.metadata["index_version"] == sha256(b"content:index").hexdigest()
        for record in store._records.values()
    )
    assert not service.search("inflation", min_score=0).grounded
