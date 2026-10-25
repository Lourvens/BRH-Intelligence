"""Offline pipeline integration contracts for parallel OCR ingestion."""

from contextlib import contextmanager
from threading import Barrier, Event, Lock

import pytest
from brh_core.config import Settings
from brh_core.db.index_manifest import DocumentBusyError
from brh_core.ingestion import pipeline
from brh_core.ingestion.metadata import document_id_for_sha256
from test_ingestion_pipeline import FakeRepository, FakeVectorStore
from test_ocr_artifact_ingestion import completed


@pytest.fixture
def corpus(tmp_path, monkeypatch):
    monkeypatch.setenv("LANGSMITH_TRACING", "false")
    settings = Settings(
        _env_file=None,
        raw_dir=tmp_path / "missing-pdfs",
        processed_dir=tmp_path / "processed",
        ocr_dir=tmp_path / "ocr",
    )
    return settings, FakeRepository(), FakeVectorStore()


def test_four_workers_process_concurrently_without_exceeding_success_limit(corpus, monkeypatch):
    settings, repository, store = corpus
    for number in range(10):
        completed(settings.resolved_ocr_dir, sha=f"{number:064x}")
    first_wave = Barrier(4)
    mutex = Lock()
    active = maximum = entered = 0

    @contextmanager
    def measured_lock(document_id):
        nonlocal active, maximum, entered
        with mutex:
            entered += 1
            ordinal = entered
            active += 1
            maximum = max(maximum, active)
        try:
            if ordinal <= 4:
                first_wave.wait(timeout=5)
            yield
        finally:
            with mutex:
                active -= 1

    monkeypatch.setattr(repository.ledger, "lock", measured_lock)
    report = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4, limit=5
    )

    assert not report.failures
    assert report.documents_found == 10
    assert report.documents_processed == report.pages_written == report.chunks_written == 5
    assert len(repository.documents) == len(store.records) == entered == 5
    assert maximum == 4
    assert active == 0


@pytest.mark.parametrize("limit", [1, 3, 5])
def test_success_limit_refills_completed_skips_and_invalid_artifacts(corpus, limit):
    settings, repository, store = corpus
    completed(settings.resolved_ocr_dir, sha=f"{0:064x}")
    initial = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4
    )
    assert initial.documents_processed == 1
    completed(settings.resolved_ocr_dir, sha=f"{1:064x}", pages=2)
    for number in range(2, 12):
        completed(settings.resolved_ocr_dir, sha=f"{number:064x}")

    report = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4, limit=limit
    )

    assert report.documents_processed == report.pages_written == report.chunks_written == limit
    assert report.documents_skipped == 1
    assert len(report.failures) == 1
    assert "expects 2 pages" in report.failures[0][1]
    assert len(repository.chunks) == len(store.records) == limit + 1
    invalid_id = document_id_for_sha256(f"{1:064x}")
    assert invalid_id not in repository.chunks
    assert all(record.metadata["document_id"] != invalid_id for record in store.records.values())


def test_duplicate_discovery_indexes_each_identity_once_and_refills(corpus, monkeypatch):
    settings, repository, store = corpus
    paths = [
        completed(settings.resolved_ocr_dir, sha=f"{number:064x}") / "document.md"
        for number in range(3)
    ]
    monkeypatch.setattr(pipeline, "discover_ocr_markdown", lambda root: [paths[0]] * 4 + paths[1:])
    writes = []
    original_replace = repository.replace_document_content

    def record_replace(document, pages, chunks):
        writes.append(document.document_id)
        return original_replace(document, pages, chunks)

    monkeypatch.setattr(repository, "replace_document_content", record_replace)
    report = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4, limit=3
    )

    assert not report.failures
    assert report.documents_found == 6
    assert report.documents_processed == 3
    assert report.documents_skipped == 3
    assert len(writes) == len(set(writes)) == len(store.records) == 3


def test_busy_document_defers_without_failure_and_remains_retryable(corpus, monkeypatch):
    settings, repository, store = corpus
    for number in range(4):
        completed(settings.resolved_ocr_dir, sha=f"{number:064x}")
    busy_id = document_id_for_sha256(f"{0:064x}")
    original_lock = repository.ledger.lock

    @contextmanager
    def busy_lock(document_id):
        if document_id == busy_id:
            raise DocumentBusyError("another worker owns this document")
        with original_lock(document_id):
            yield

    monkeypatch.setattr(repository.ledger, "lock", busy_lock)
    report = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4, limit=2
    )

    assert not report.failures
    assert report.documents_deferred == 1
    assert report.documents_processed == 2
    assert busy_id not in repository.documents
    assert not repository.failed
    assert len(repository.documents) == len(store.records) == 2

    monkeypatch.setattr(repository.ledger, "lock", original_lock)
    resumed = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4
    )
    assert not resumed.failures
    assert resumed.documents_processed == resumed.documents_skipped == 2
    assert resumed.documents_deferred == 0
    assert busy_id in repository.documents
    assert len(repository.documents) == len(store.records) == 4


def test_initial_stop_event_performs_no_document_work(corpus, monkeypatch):
    settings, repository, store = corpus
    completed(settings.resolved_ocr_dir)
    stop = Event()
    stop.set()

    def forbidden(*args, **kwargs):
        pytest.fail("stopped ingestion must not load or lock a document")

    monkeypatch.setattr(pipeline.OcrArtifact, "load", forbidden)
    monkeypatch.setattr(repository.ledger, "lock", forbidden)
    report = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4, stop=stop
    )

    assert report.documents_found == 1
    assert report.documents_processed == report.documents_skipped == report.documents_deferred == 0
    assert report.pages_written == report.chunks_written == 0
    assert not report.failures
    assert not repository.documents
    assert not repository.jobs
    assert not repository.ledger.states
    assert not store.records


def test_artifact_arriving_during_run_is_preserved_for_next_discovery(corpus, monkeypatch):
    settings, repository, store = corpus
    completed(settings.resolved_ocr_dir, sha="a" * 64, text="Premier document")
    late_id = document_id_for_sha256("b" * 64)
    original_lock = repository.ledger.lock
    late_directory = None

    @contextmanager
    def arrival_lock(document_id):
        nonlocal late_directory
        with original_lock(document_id):
            late_directory = completed(
                settings.resolved_ocr_dir, sha="b" * 64, text="Document arrivé pendant le cycle"
            )
            yield

    monkeypatch.setattr(repository.ledger, "lock", arrival_lock)
    first = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4
    )
    assert not first.failures
    assert first.documents_found == first.documents_processed == 1
    assert late_id not in repository.documents
    assert late_directory is not None
    preserved = {path.name: path.read_bytes() for path in late_directory.iterdir()}
    assert set(preserved) == {"document.md", "meta.json"}

    monkeypatch.setattr(repository.ledger, "lock", original_lock)
    resumed = pipeline.run_ingestion(
        settings, repository=repository, vector_store=store, from_ocr=True, workers=4
    )
    assert not resumed.failures
    assert resumed.documents_found == 2
    assert resumed.documents_processed == resumed.documents_skipped == 1
    assert late_id in repository.documents
    assert len(repository.documents) == len(store.records) == 2
    assert {path.name: path.read_bytes() for path in late_directory.iterdir()} == preserved
