"""Offline reliability tests for discovery, extraction, and chunk persistence."""

from __future__ import annotations

from pathlib import Path

import pymupdf
import pytest
from brh_core.catalog import catalog_path, read_catalog, write_catalog
from brh_core.config import Settings
from brh_core.db.index_manifest import MemoryIndexLedger
from brh_core.ingestion.discover import discover_pdfs
from brh_core.ingestion.extract import InvalidOcrArtifact, extract_pages
from brh_core.ingestion.metadata import document_id_for_sha256, sha256_of_file
from brh_core.ingestion.pipeline import run_ingestion
from brh_core.models import Document, JobStatus, VectorRecord


class FakeRepository:
    def __init__(self) -> None:
        self.documents: dict[str, Document] = {}
        self.pages: dict[str, list] = {}
        self.chunks: dict[str, list] = {}
        self.jobs: set[tuple[str, str, str]] = set()
        self.failed: list[tuple[str, str, str]] = []
        self.ledger = MemoryIndexLedger()

    def index_ledger(self):
        return self.ledger

    def upsert_document(self, document):
        self.documents[document.document_id] = document

    def get_documents(self, ids):
        return {key: self.documents[key] for key in ids if key in self.documents}

    def get_chunks(self, ids):
        wanted = set(ids)
        return {
            chunk.chunk_id: chunk
            for chunks in self.chunks.values()
            for chunk in chunks
            if chunk.chunk_id in wanted
        }

    def get_document_by_sha256(self, sha256: str) -> Document | None:
        return next((doc for doc in self.documents.values() if doc.sha256 == sha256), None)

    def get_document_by_slug(self, slug: str) -> Document | None:
        return next((doc for doc in self.documents.values() if doc.slug == slug), None)

    def list_documents(self) -> list[Document]:
        return list(self.documents.values())

    def job_succeeded(self, document_id: str, stage, key: str) -> bool:
        return (document_id, stage.value, key) in self.jobs

    def replace_document_content(self, document: Document, pages: list, chunks: list) -> None:
        self.documents[document.document_id] = document
        self.pages[document.document_id] = list(pages)
        self.chunks[document.document_id] = list(chunks)

    def get_chunks_for_document(self, document_id: str) -> list:
        return self.chunks.get(document_id, [])

    def record_job(
        self, document_id: str, stage, key: str, *, status=JobStatus.succeeded, **kwargs
    ) -> None:
        if status is JobStatus.succeeded:
            self.jobs.add((document_id, stage.value, key))
        else:
            self.failed.append((document_id, stage.value, key))


class FakeVectorStore:
    def __init__(self) -> None:
        self.records: dict[str, VectorRecord] = {}
        self.deleted: list[str] = []

    def upsert(self, records: list[VectorRecord]) -> int:
        self.records.update({record.id: record for record in records})
        return len(records)

    def delete(self, ids: list[str]) -> int:
        self.deleted.extend(ids)
        for record_id in ids:
            self.records.pop(record_id, None)
        return len(ids)

    def list_ids(self, prefix):
        return [record_id for record_id in self.records if record_id.startswith(prefix)]

    def matching_ids(self, records):
        return {record.id for record in records if self.records.get(record.id) == record}

    def verify(self, records, *, absent_ids=()):
        assert all(self.records.get(record.id) == record for record in records)
        assert not any(record_id in self.records for record_id in absent_ids)


def make_pdf(path: Path, pages: tuple[str, ...]) -> None:
    document = pymupdf.open()
    for text in pages:
        page = document.new_page()
        if text:
            page.insert_text((72, 72), text)
    document.save(path)
    document.close()


def test_discovery_is_recursive_and_case_insensitive(tmp_path: Path) -> None:
    nested = tmp_path / "web" / "nested"
    nested.mkdir(parents=True)
    (tmp_path / "ignore.txt").write_text("x")
    (tmp_path / "one.PDF").write_bytes(b"one")
    (nested / "two.pdf").write_bytes(b"two")

    assert discover_pdfs(tmp_path) == [tmp_path / "one.PDF", nested / "two.pdf"]


def test_extract_fills_blank_pdf_pages_from_page_marked_ocr(tmp_path: Path) -> None:
    pdf = tmp_path / "document.pdf"
    make_pdf(pdf, ("text layer", ""))
    ocr = tmp_path / "document.md"
    ocr.write_text("<!-- page 1 -->\ncanonical OCR\n\n<!-- page 2 -->\nOCR fallback")

    pages = extract_pages(pdf, ocr_markdown=ocr)

    assert [page.text.strip() for page in pages] == ["canonical OCR", "OCR fallback"]


def test_document_identity_is_stable_and_collision_safe(tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    raw.mkdir()
    first = raw / "same-name.pdf"
    second_dir = raw / "nested"
    second_dir.mkdir()
    second = second_dir / "same-name.pdf"
    make_pdf(first, ("first",))
    make_pdf(second, ("second",))
    settings = Settings(
        _env_file=None,
        raw_dir=raw,
        processed_dir=tmp_path / "processed",
        ocr_dir=tmp_path / "ocr",
    )
    repository = FakeRepository()

    report = run_ingestion(settings, repository=repository, raw_dir=raw)

    assert report.documents_processed == 2
    assert len(repository.documents) == 2
    assert {doc.document_id for doc in repository.documents.values()} == {
        document_id_for_sha256(sha256_of_file(first)),
        document_id_for_sha256(sha256_of_file(second)),
    }
    assert len({doc.slug for doc in repository.documents.values()}) == 2


def test_rerunning_ingestion_does_not_duplicate_documents_or_chunks(tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    raw.mkdir()
    pdf = raw / "report.pdf"
    make_pdf(pdf, ("# Rapport\n\nUn texte indexable.",))
    settings = Settings(
        _env_file=None,
        raw_dir=raw,
        processed_dir=tmp_path / "processed",
        ocr_dir=tmp_path / "ocr",
    )
    repository = FakeRepository()

    first = run_ingestion(settings, repository=repository, raw_dir=raw)
    second = run_ingestion(settings, repository=repository, raw_dir=raw)
    forced = run_ingestion(settings, repository=repository, raw_dir=raw, force=True)

    assert first.documents_processed == 1
    assert second.documents_processed == 0 and second.documents_skipped == 1
    assert forced.documents_processed == 1
    assert len(repository.documents) == 1
    assert len(next(iter(repository.chunks.values()))) == 1


def test_fallback_content_is_reprocessed_when_ocr_artifact_arrives(tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    raw.mkdir()
    pdf = raw / "report.pdf"
    make_pdf(pdf, ("PDF fallback",))
    ocr_dir = tmp_path / "ocr"
    settings = Settings(
        _env_file=None,
        raw_dir=raw,
        processed_dir=tmp_path / "processed",
        ocr_dir=ocr_dir,
    )
    repository = FakeRepository()

    first = run_ingestion(settings, repository=repository, raw_dir=raw)
    assert first.documents_processed == 1
    document_sha = sha256_of_file(pdf)
    assert repository.pages[next(iter(repository.pages))][0].text.strip() == "PDF fallback"

    artifact = ocr_dir / document_sha
    artifact.mkdir(parents=True)
    (artifact / "document.md").write_text("<!-- page 1 -->\nPaddleOCR canonical text")

    resumed = run_ingestion(settings, repository=repository, raw_dir=raw)

    assert resumed.documents_processed == 1
    assert (
        repository.pages[next(iter(repository.pages))][0].text.strip() == "PaddleOCR canonical text"
    )


def test_reindex_deletes_chunks_removed_by_later_ocr(tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    raw.mkdir()
    pdf = raw / "report.pdf"
    make_pdf(pdf, (" ".join(["fallback"] * 120),))
    ocr_dir = tmp_path / "ocr"
    settings = Settings(
        _env_file=None,
        raw_dir=raw,
        processed_dir=tmp_path / "processed",
        ocr_dir=ocr_dir,
        chunk_token_limit=20,
        chunk_token_reserve=0,
    )
    repository = FakeRepository()
    vector_store = FakeVectorStore()

    run_ingestion(settings, repository=repository, vector_store=vector_store, raw_dir=raw)
    old_ids = set(vector_store.records)
    assert len(old_ids) > 1

    document_sha = sha256_of_file(pdf)
    artifact = ocr_dir / document_sha
    artifact.mkdir(parents=True)
    (artifact / "document.md").write_text("<!-- page 1 -->\ncanonical OCR")

    run_ingestion(settings, repository=repository, vector_store=vector_store, raw_dir=raw)

    current_ids = {chunk.chunk_id for chunk in repository.chunks[next(iter(repository.chunks))]}
    assert set(vector_store.records) == current_ids
    assert set(vector_store.deleted) == old_ids - current_ids


def test_catalog_is_atomic_and_round_trips(tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    raw.mkdir()
    pdf = raw / "catalogued.pdf"
    make_pdf(pdf, ("catalogue",))
    settings = Settings(
        _env_file=None,
        raw_dir=raw,
        processed_dir=tmp_path / "processed",
        ocr_dir=tmp_path / "ocr",
    )
    repository = FakeRepository()
    run_ingestion(settings, repository=repository, raw_dir=raw)

    target = write_catalog(settings, repository)

    assert target == catalog_path(settings)
    assert read_catalog(settings)[0]["sha256"] == next(iter(repository.documents.values())).sha256


def test_duplicate_ocr_page_markers_are_rejected_instead_of_losing_text(tmp_path):
    pdf = tmp_path / "report.pdf"
    make_pdf(pdf, ("Page une", "Page deux"))
    ocr = tmp_path / "document.md"
    ocr.write_text("<!-- page 1 -->\nfirst\n<!-- page 1 -->\noverwrite\n<!-- page 2 -->\nend")
    with pytest.raises(InvalidOcrArtifact, match="unique and in order"):
        extract_pages(pdf, ocr_markdown=ocr)
