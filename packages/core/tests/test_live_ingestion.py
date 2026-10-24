"""Opt-in acceptance against real Postgres and the chosen Pinecone hosted model."""

import json
import os
import subprocess
import sys
from uuid import uuid4

import psycopg
import pytest
from brh_core.config import Settings
from brh_core.db.migrate import apply_migrations
from brh_core.db.pool import open_pool
from brh_core.db.repository import CorpusRepository
from brh_core.ingestion.chunk import chunk_pages
from brh_core.ingestion.extract import ExtractedPage
from brh_core.ingestion.metadata import document_id_for_sha256, sha256_of_file
from brh_core.ingestion.pipeline import run_ingestion
from brh_core.ingestion.tokenizer import production_counter
from brh_core.retrieval.service import RetrievalService
from brh_core.vectorstore.factory import build_vector_store
from psycopg import sql
from test_ingestion_pipeline import make_pdf


@pytest.mark.integration
@pytest.mark.skipif(os.getenv("BRH_TEST_PINECONE") != "1", reason="Live Pinecone test is opt-in")
def test_live_pdf_ocr_index_reconcile_and_citations(tmp_path):
    base = Settings()
    suffix = uuid4().hex[:12]
    database = "brh_live_test_" + suffix
    namespace = "brh-ingestion-test-" + suffix
    with psycopg.connect(base.postgres_dsn, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))
    pool = store = None
    document_id = None
    try:
        raw = tmp_path / "raw"
        raw.mkdir()
        settings = base.model_copy(
            update={
                "postgres_db": database,
                "pinecone_namespace": namespace,
                "raw_dir": raw,
                "ocr_dir": tmp_path / "ocr",
                "processed_dir": tmp_path / "processed",
                "chunk_token_limit": 80,
            }
        )
        apply_migrations(settings)
        pool = open_pool(settings)
        pool.open(wait=True)
        repository = CorpusRepository(pool)
        store = build_vector_store(settings)
        tokenizer_id, count = production_counter(settings)
        pdf = raw / "rapport-inflation.pdf"
        make_pdf(pdf, ("\n".join(["Inflation prix banque economie Haiti"] * 35),))
        document_id = document_id_for_sha256(sha256_of_file(pdf))
        options = {"count_tokens": count, "tokenizer_id": tokenizer_id}
        first = run_ingestion(settings, repository=repository, vector_store=store, **options)
        assert not first.failures, first.failures
        document_id = repository.list_documents()[0].document_id
        previous = set(store.list_ids(document_id + ":"))
        assert len(previous) > 1
        artifact = settings.resolved_ocr_dir / sha256_of_file(pdf)
        artifact.mkdir(parents=True)
        (artifact / "document.md").write_text(
            "<!-- page 1 -->\nLa BRH suit les prix et le taux inflation en Haïti."
        )
        second = run_ingestion(settings, repository=repository, vector_store=store, **options)
        assert not second.failures, second.failures
        current = set(store.list_ids(document_id + ":"))
        assert len(current) == 1
        assert current < previous
        service = RetrievalService(settings, vector_store=store, repository=repository)
        result = service.search("Comment la BRH suit les prix et inflation ?", min_score=0)
        assert result.grounded
        assert result.citations[0].page_number == 1
        assert result.citations[0].pdf_url.endswith("#page=1")
        assert "Haïti" in result.chunks[0].text
        assert service.as_retriever(min_score=0).invoke("prix inflation")
        assert (
            run_ingestion(
                settings, repository=repository, vector_store=store, **options
            ).documents_skipped
            == 1
        )
        repaired = run_ingestion(
            settings, repository=repository, vector_store=store, reconcile=True, **options
        )
        assert not repaired.failures
        # Exercise the actual operator entry point, not just the Python API.
        completed = subprocess.run(
            [sys.executable, "-m", "brh_core.ingestion", "--index", "--reconcile", "--limit", "1"],
            env={
                **os.environ,
                "BRH_POSTGRES_DB": database,
                "BRH_PINECONE_NAMESPACE": namespace,
                "BRH_RAW_DIR": str(raw),
                "BRH_OCR_DIR": str(settings.resolved_ocr_dir),
                "BRH_PROCESSED_DIR": str(settings.resolved_processed_dir),
                "BRH_CHUNK_TOKEN_LIMIT": "80",
                "LANGSMITH_TRACING": "false",
                "LANGCHAIN_TRACING_V2": "false",
            },
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert completed.returncode == 0, completed.stderr
        reports = [json.loads(line) for line in completed.stdout.splitlines()]
        assert reports[0]["documents_processed"] == 1
        assert reports[0]["failures"] == []
        assert reports[1]["stage"] == "reconciliation"
        assert reports[1]["documents_processed"] == 1
    finally:
        if store is not None and document_id:
            ids = store.list_ids(document_id + ":")
            store.delete(ids)
            store.verify([], absent_ids=ids)
        if pool is not None:
            pool.close()
        with psycopg.connect(base.postgres_dsn, autocommit=True) as admin:
            admin.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(database)))


@pytest.mark.integration
@pytest.mark.skipif(os.getenv("BRH_TEST_PINECONE") != "1", reason="Tokenizer download is opt-in")
def test_production_tokenizer_caps_french_noise_and_large_html_table():
    _, count = production_counter(Settings())
    samples = [
        "Évolution de l’économie et des prix en Haïti. " * 300,
        "é€0123456789" * 300,
        "<table><tr><td>Indicateur</td><td>2025</td><td>2026</td></tr>"
        + "".join(
            f"<tr><td>Inflation {i}</td><td>25,4 %</td><td>20,1 %</td></tr>" for i in range(50)
        )
        + "</table>",
    ]
    for text in samples:
        chunks = chunk_pages("doc", [ExtractedPage(1, text)], max_tokens=448, count_tokens=count)
        assert chunks
        assert all(count(chunk.text) <= 448 for chunk in chunks)
