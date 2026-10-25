"""Opt-in Qwen → raw Pinecone → canonical citation acceptance."""

import json
import os
from hashlib import sha256
from uuid import uuid4

import psycopg
import pytest
from brh_core.config import EmbeddingProvider, Settings, VectorBackend
from brh_core.db.migrate import apply_migrations
from brh_core.db.pool import open_pool
from brh_core.db.repository import CorpusRepository
from brh_core.ingestion.pipeline import embed_id, reconcile_corpus, run_ingestion
from brh_core.ingestion.tokenizer import production_counter
from brh_core.retrieval.service import RetrievalService
from brh_core.vectorstore.factory import build_vector_store
from psycopg import sql


@pytest.mark.integration
@pytest.mark.skipif(os.getenv("BRH_TEST_QWEN") != "1", reason="Live embedding requests are opt-in")
def test_live_artifact_qwen_index_resume_and_page_citation(tmp_path):
    base = Settings()
    suffix = uuid4().hex[:12]
    database = "brh_qwen_test_" + suffix
    namespace = "brh-qwen-test-" + suffix
    with psycopg.connect(base.postgres_dsn, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))
    pool = store = None
    try:
        settings = base.model_copy(
            update={
                "postgres_db": database,
                "embedding_provider": EmbeddingProvider.openrouter,
                "embedding_model": "qwen/qwen3-embedding-8b",
                "embedding_tokenizer": "Qwen/Qwen3-Embedding-8B",
                "embedding_tokenizer_revision": "1d8ad4ca9b3dd8059ad90a75d4983776a23d44af",
                "vector_backend": VectorBackend.pinecone,
                "pinecone_index_name": "brh-intelligence-qwen-1024",
                "pinecone_namespace": namespace,
                "ocr_dir": tmp_path / "ocr",
                "processed_dir": tmp_path / "processed",
                "chunk_target_tokens": 768,
                "chunk_max_tokens": 1536,
            }
        )
        apply_migrations(settings)
        pool = open_pool(settings)
        pool.open(wait=True)
        repository = CorpusRepository(pool)
        store = build_vector_store(settings)
        identity, count = production_counter(settings)
        text = (
            "La BRH publie les réserves internationales en dollars américains "
            "et le taux de change de la gourde."
        )
        sha = sha256((suffix + text).encode()).hexdigest()
        directory = settings.resolved_ocr_dir / sha
        directory.mkdir(parents=True)
        (directory / "document.md").write_text("<!-- page 1 -->\n" + text)
        (directory / "meta.json").write_text(
            json.dumps(
                {
                    "sha256": sha,
                    "pages": 1,
                    "engine": "paddleocr-vl",
                    "finished_at": "2026-10-25T00:00:00Z",
                }
            )
        )
        options = dict(
            repository=repository, vector_store=store, count_tokens=count, tokenizer_id=identity
        )
        report = run_ingestion(settings, from_ocr=True, workers=4, **options)
        assert not report.failures, report.failures
        assert report.documents_processed == 1
        assert store.count() == 1
        progress = repository.index_progress(store.target_id, embed_id(settings))
        assert progress["documents_verified"] == progress["vectors_verified"] == 1
        requests = store._embedder.metrics["requests"]
        assert run_ingestion(settings, from_ocr=True, **options).documents_skipped == 1
        assert store._embedder.metrics["requests"] == requests
        repaired = reconcile_corpus(settings, **options)
        assert not repaired.failures
        assert store._embedder.metrics["requests"] == requests
        result = RetrievalService(settings, vector_store=store, repository=repository).search(
            "Dans quelle monnaie sont publiées les réserves internationales ?", min_score=0
        )
        assert result.grounded
        assert result.citations[0].page_number == 1
        assert result.citations[0].pdf_url.endswith("#page=1")
        assert "dollars américains" in result.chunks[0].text
        document = repository.list_documents()[0]
        page = repository.get_page(document.document_id, 1)
        repository.reset_derived_document(document.document_id)
        assert (
            repository.index_progress(store.target_id, embed_id(settings))["documents_verified"]
            == 0
        )
        assert repository.get_page(document.document_id, 1) == page
        assert repository.get_document(document.document_id) is not None
        assert repository.get_chunks_for_document(document.document_id) == []
        with pool.connection() as connection:
            stages = connection.execute(
                "SELECT stage FROM corpus.processing_jobs WHERE document_id=%s",
                (document.document_id,),
            ).fetchall()
        assert stages and all(row["stage"] == "extract" for row in stages)
    finally:
        if store is not None:
            store.delete(store.list_ids(""))
        if pool is not None:
            pool.close()
        with psycopg.connect(base.postgres_dsn, autocommit=True) as admin:
            admin.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(database)))
