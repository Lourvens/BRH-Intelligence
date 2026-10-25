"""Start at completed extraction artifacts while additional OCR is arriving."""

import json

from brh_core.config import Settings
from brh_core.ingestion.pipeline import run_ingestion
from test_ingestion_pipeline import FakeRepository, FakeVectorStore


def completed(root, sha="a" * 64, text="Texte OCR BRH", pages=1):
    directory = root / sha
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "document.md").write_text("<!-- page 1 -->\n" + text)
    (directory / "meta.json").write_text(
        json.dumps(
            {
                "sha256": sha,
                "engine": "paddleocr-vl",
                "engine_version": "3.7.0",
                "pages": pages,
                "finished_at": "2026-10-24T00:00:00Z",
            }
        )
    )
    return directory


def test_completed_ocr_indexes_without_local_pdf_or_reextracting(tmp_path, monkeypatch):
    settings = Settings(_env_file=None, raw_dir=tmp_path / "missing-pdfs", ocr_dir=tmp_path / "ocr")
    completed(settings.resolved_ocr_dir)
    repository = FakeRepository()
    store = FakeVectorStore()

    def forbidden(*args, **kwargs):
        raise AssertionError("Artifact-first ingestion must not extract a PDF")

    monkeypatch.setattr("brh_core.ingestion.pipeline.extract_pages", forbidden)
    first = run_ingestion(settings, repository=repository, vector_store=store, from_ocr=True)
    assert not first.failures
    assert first.documents_processed == 1
    assert next(iter(repository.documents.values())).source_path is None
    assert next(iter(store.records.values())).text == "Texte OCR BRH"
    assert (
        run_ingestion(
            settings, repository=repository, vector_store=store, from_ocr=True
        ).documents_skipped
        == 1
    )


def test_later_ocr_arrival_is_found_without_repeating_completed_work(tmp_path):
    settings = Settings(_env_file=None, raw_dir=tmp_path / "missing", ocr_dir=tmp_path / "ocr")
    completed(settings.resolved_ocr_dir)
    repository = FakeRepository()
    store = FakeVectorStore()
    run_ingestion(settings, repository=repository, vector_store=store, from_ocr=True)
    completed(settings.resolved_ocr_dir, sha="b" * 64, text="Nouveau document extrait")
    resumed = run_ingestion(settings, repository=repository, vector_store=store, from_ocr=True)
    assert resumed.documents_processed == resumed.documents_skipped == 1
    assert len(repository.documents) == len(store.records) == 2


def test_artifact_without_completion_metadata_waits_for_the_pull(tmp_path):
    settings = Settings(_env_file=None, ocr_dir=tmp_path / "ocr")
    directory = completed(settings.resolved_ocr_dir)
    (directory / "meta.json").unlink()
    repository = FakeRepository()
    report = run_ingestion(settings, repository=repository, from_ocr=True)
    assert not report.failures
    assert report.documents_deferred == 1
    assert not repository.documents


def test_incorrect_completion_page_count_fails_before_indexing(tmp_path):
    settings = Settings(_env_file=None, ocr_dir=tmp_path / "ocr")
    completed(settings.resolved_ocr_dir, pages=2)
    store = FakeVectorStore()
    report = run_ingestion(settings, repository=FakeRepository(), vector_store=store, from_ocr=True)
    assert len(report.failures) == 1
    assert "expects 2 pages" in report.failures[0][1]
    assert not store.records


def test_changed_ocr_replaces_existing_artifact_chunks(tmp_path):
    settings = Settings(_env_file=None, ocr_dir=tmp_path / "ocr", chunk_token_limit=20)
    completed(settings.resolved_ocr_dir, text="Texte long " * 150)
    store = FakeVectorStore()
    repository = FakeRepository()
    run_ingestion(settings, repository=repository, vector_store=store, from_ocr=True)
    assert len(store.records) > 1
    completed(settings.resolved_ocr_dir, text="OCR corrigé")
    report = run_ingestion(settings, repository=repository, vector_store=store, from_ocr=True)
    assert report.documents_processed == 1
    assert len(store.records) == 1
    assert store.deleted


def test_blank_completed_ocr_defers_without_starving_readable_artifacts(tmp_path):
    settings = Settings(_env_file=None, ocr_dir=tmp_path / "ocr")
    completed(settings.resolved_ocr_dir, sha="0" * 64, text="")
    completed(settings.resolved_ocr_dir, sha="1" * 64, text="Texte lisible BRH")
    report = run_ingestion(
        settings,
        repository=FakeRepository(),
        vector_store=FakeVectorStore(),
        from_ocr=True,
        workers=4,
        limit=1,
    )
    assert not report.failures
    assert report.documents_deferred == report.documents_processed == 1
