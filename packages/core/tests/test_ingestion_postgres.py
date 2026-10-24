"""Real Postgres acceptance test; opt in with BRH_TEST_POSTGRES=1."""

import os
from uuid import uuid4

import psycopg
import pytest
from brh_core.config import Settings
from brh_core.db.migrate import apply_migrations
from brh_core.db.pool import open_pool
from brh_core.db.repository import CorpusRepository
from brh_core.ingestion.metadata import sha256_of_file
from brh_core.ingestion.pipeline import run_ingestion
from brh_core.retrieval.service import RetrievalService
from psycopg import sql
from test_ingestion_pipeline import make_pdf
from test_pinecone_integrated import FakeIndex, make_store


@pytest.mark.integration
@pytest.mark.skipif(os.getenv("BRH_TEST_POSTGRES") != "1", reason="Postgres test is opt-in")
def test_real_postgres_survives_restart_and_partial_remote_delete(tmp_path):
    base = Settings()
    test_database = "brh_ingestion_test_" + uuid4().hex[:12]
    with psycopg.connect(base.postgres_dsn, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(test_database)))
    pool = None
    try:
        raw = tmp_path / "raw"
        raw.mkdir()
        settings = Settings(
            _env_file=None,
            postgres_host=base.postgres_host,
            postgres_port=base.postgres_port,
            postgres_user=base.postgres_user,
            postgres_password=base.postgres_password,
            postgres_db=test_database,
            raw_dir=raw,
            ocr_dir=tmp_path / "ocr",
            processed_dir=tmp_path / "processed",
            chunk_token_limit=20,
        )
        assert "0004_index_manifest" in apply_migrations(settings)
        assert apply_migrations(settings) == []
        pool = open_pool(settings)
        pool.open(wait=True)
        repository = CorpusRepository(pool)
        pdf = raw / "report.pdf"
        make_pdf(pdf, ("\n".join(["inflation prix économie banque"] * 30),))
        remote = FakeIndex()
        store = make_store(remote)
        options = {
            "count_tokens": lambda text: len(text.split()),
            "tokenizer_id": "fixture-exact:v1",
        }
        first = run_ingestion(settings, repository=repository, vector_store=store, **options)
        assert not first.failures
        assert len(remote.records) > 1
        artifact = settings.resolved_ocr_dir / sha256_of_file(pdf)
        artifact.mkdir(parents=True)
        (artifact / "document.md").write_text("<!-- page 1 -->\nInflation canonique BRH")
        remote.fail_delete = 1
        failed = run_ingestion(settings, repository=repository, vector_store=store, **options)
        assert failed.failures
        pool.close()
        pool = open_pool(settings)
        pool.open(wait=True)
        repository = CorpusRepository(pool)
        recovered = run_ingestion(
            settings, repository=repository, vector_store=make_store(remote), **options
        )
        assert not recovered.failures
        assert len(remote.records) == 1
        service = RetrievalService(settings, vector_store=store, repository=repository)
        assert service.search("inflation").grounded
        document = repository.list_documents()[0]
        assert service.get_document(document.slug) == document
        assert service.get_page_text(document.slug, 1) == "Inflation canonique BRH"
        assert service.stats()["chunks"] == 1
    finally:
        if pool is not None:
            pool.close()
        with psycopg.connect(base.postgres_dsn, autocommit=True) as admin:
            admin.execute(
                sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(test_database))
            )
