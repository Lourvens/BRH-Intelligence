"""Reliable local ingestion from PDF discovery through chunk persistence.

Idempotency (ADR-0003): the ``index`` stage is keyed by
``{sha256}:{chunker_id}:{embed_id}``. Re-running without ``force`` skips a
document whose index job already succeeded for the same key, so a chunker or
embedding-model change is the *only* thing that triggers re-indexing.

The vector store is optional until the embedding phase is enabled. Postgres is
updated atomically per document: a rerun cannot leave a new page set paired
with an old chunk set.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from brh_core.config import Settings
from brh_core.db.repository import CorpusRepository
from brh_core.ingestion.chunk import chunk_pages
from brh_core.ingestion.chunk import chunker_id as structure_chunker_id
from brh_core.ingestion.discover import discover_pdfs
from brh_core.ingestion.extract import extract_pages
from brh_core.ingestion.metadata import (
    document_id_for_sha256,
    infer_title,
    infer_volume,
    sha256_of_file,
    slugify,
)
from brh_core.models import Chunk, Document, JobStage, JobStatus, Language, SourceKind, VectorRecord
from brh_core.vectorstore.base import VectorStore


@dataclass(frozen=True, slots=True)
class IngestionReport:
    """Outcome of one ingestion run."""

    documents_found: int
    documents_processed: int
    documents_skipped: int
    pages_written: int
    chunks_written: int
    failures: tuple[tuple[str, str], ...] = field(default_factory=tuple)


def chunker_id(settings: Settings, *, tokenizer_id: str | None = None) -> str:
    """Stable id for the active structure-aware strategy."""
    return structure_chunker_id(
        max_tokens=_chunk_cap(settings),
        tokenizer_id=tokenizer_id or settings.chunk_tokenizer_id,
    )


def embed_id(settings: Settings) -> str:
    """Stable id for the embedding strategy, e.g. ``pinecone:multilingual-e5-large``."""
    return (
        f"{settings.embedding_provider.value}:{settings.embedding_model}:{settings.embedding_dim}"
    )


def index_key(
    sha256: str,
    settings: Settings,
    *,
    tokenizer_id: str | None = None,
    extraction_key: str = "unknown-extraction",
) -> str:
    """Idempotency key for content, extraction and embedding versions."""
    return (
        f"{sha256}:{extraction_key}:{chunker_id(settings, tokenizer_id=tokenizer_id)}"
        f":{embed_id(settings)}"
    )


def run_ingestion(
    settings: Settings,
    *,
    repository: CorpusRepository,
    vector_store: VectorStore | None = None,
    raw_dir: Path | None = None,
    force: bool = False,
    limit: int | None = None,
    count_tokens: Callable[[str], int] | None = None,
    tokenizer_id: str | None = None,
) -> IngestionReport:
    """Ingest every discovered PDF; contain per-file errors."""
    paths = discover_pdfs(raw_dir or settings.resolved_raw_dir)
    if limit is not None:
        paths = paths[:limit]

    processed = skipped = pages_written = chunks_written = 0
    failures: list[tuple[str, str]] = []
    for pdf_path in paths:
        try:
            result = _ingest_document(
                settings,
                repository=repository,
                vector_store=vector_store,
                pdf_path=pdf_path,
                force=force,
                count_tokens=count_tokens,
                tokenizer_id=tokenizer_id,
            )
        except Exception as exc:  # one bad document must not stop a backfill
            failures.append((str(pdf_path), str(exc)))
            continue
        if result is None:
            skipped += 1
            continue
        processed += 1
        pages_written += result[0]
        chunks_written += result[1]

    return IngestionReport(
        documents_found=len(paths),
        documents_processed=processed,
        documents_skipped=skipped,
        pages_written=pages_written,
        chunks_written=chunks_written,
        failures=tuple(failures),
    )


def _ingest_document(
    settings: Settings,
    *,
    repository: CorpusRepository,
    vector_store: VectorStore | None,
    pdf_path: Path,
    force: bool,
    count_tokens: Callable[[str], int] | None,
    tokenizer_id: str | None,
) -> tuple[int, int] | None:
    sha256 = sha256_of_file(pdf_path)
    existing = repository.get_document_by_sha256(sha256)
    document_id = existing.document_id if existing else document_id_for_sha256(sha256)
    ocr_path = settings.resolved_ocr_dir / sha256 / "document.md"
    extraction_key, extraction_source = _extraction_identity(pdf_path, ocr_path)
    index_key_value = index_key(
        sha256,
        settings,
        tokenizer_id=tokenizer_id,
        extraction_key=extraction_key,
    )
    content_key = (
        f"{sha256}:{extraction_key}:{chunker_id(settings, tokenizer_id=tokenizer_id)}"
    )
    has_content = repository.job_succeeded(document_id, JobStage.chunk, content_key)
    needs_index = vector_store is not None and not repository.job_succeeded(
        document_id, JobStage.index, index_key_value
    )
    if not force and has_content and not needs_index:
        return None

    pages: list = []
    chunks: list[Chunk] = []
    previous_chunk_ids: set[str] = set()
    if force or not has_content:
        if vector_store is not None and existing is not None:
            previous_chunk_ids = {
                chunk.chunk_id for chunk in repository.get_chunks_for_document(document_id)
            }
        try:
            pages = extract_pages(pdf_path, ocr_markdown=ocr_path)
            chunks = chunk_pages(
                document_id,
                pages,
                max_tokens=_chunk_cap(settings),
                count_tokens=count_tokens,
            )
            document = _build_document(
                settings,
                repository,
                pdf_path,
                sha256,
                document_id,
                existing,
                len(pages),
                extraction_source=extraction_source,
            )
            _replace_content(repository, document, pages, chunks)
            repository.record_job(
                document_id,
                JobStage.extract,
                extraction_key,
                metrics={
                    "pages": len(pages),
                    "path": str(pdf_path),
                    "source": extraction_source,
                },
            )
            repository.record_job(
                document_id,
                JobStage.chunk,
                content_key,
                metrics={
                    "chunks": len(chunks),
                    "chunker": chunker_id(settings, tokenizer_id=tokenizer_id),
                },
            )
        except Exception as exc:
            repository.record_job(
                document_id, JobStage.extract, sha256, status=JobStatus.failed, error=str(exc)
            )
            raise
    elif vector_store is not None:
        stored = repository.get_chunks_for_document(document_id)
        chunks = list(stored)

    if vector_store is not None and (force or needs_index):
        records = [_vector_record(chunk) for chunk in chunks]
        desired_chunk_ids = {record.id for record in records}
        stale_chunk_ids = sorted(previous_chunk_ids - desired_chunk_ids)
        try:
            vector_store.upsert(records)
            if stale_chunk_ids:
                vector_store.delete(stale_chunk_ids)
            repository.record_job(
                document_id,
                JobStage.index,
                index_key_value,
                metrics={
                    "chunks": len(records),
                    "embedding": embed_id(settings),
                    "stale_vectors_deleted": len(stale_chunk_ids),
                },
            )
        except Exception as exc:
            repository.record_job(
                document_id,
                JobStage.index,
                index_key_value,
                status=JobStatus.failed,
                error=str(exc),
            )
            raise

    return len(pages), len(chunks)


def _chunk_cap(settings: Settings) -> int:
    """Keep content below the model limit, including a configurable reserve."""
    safe_limit = max(1, 512 - settings.chunk_token_reserve)
    return min(settings.chunk_token_limit, safe_limit)


def _build_document(
    settings: Settings,
    repository: CorpusRepository,
    pdf_path: Path,
    sha256: str,
    document_id: str,
    existing: Document | None,
    page_count: int,
    extraction_source: str,
) -> Document:
    source = _source_metadata(repository, sha256)
    base_slug = slugify(pdf_path.stem)
    source = source or {}
    source_slug = slugify(str(source.get("slug"))) if source.get("slug") else base_slug
    owner = repository.get_document_by_slug(source_slug)
    slug = (
        source_slug
        if owner is None or owner.sha256 == sha256
        else f"{source_slug}-{sha256[:12]}"
    )
    source_kind = (
        SourceKind.pdf_web
        if pdf_path.is_relative_to(settings.web_store_dir)
        else SourceKind.pdf_local
    )
    return Document(
        document_id=document_id,
        sha256=sha256,
        slug=existing.slug if existing and existing.sha256 == sha256 else slug,
        title=(
            existing.title
            if existing and existing.title
            else str(source.get("title") or infer_title(pdf_path.stem))
        ),
        source_kind=source_kind,
        language=Language.fr,
        source_path=str(pdf_path),
        source_url=str(source["source_url"]) if source.get("source_url") else None,
        publication_date=_publication_date(source),
        volume=infer_volume(pdf_path.stem),
        page_count=page_count,
        metadata={"extraction_source": extraction_source},
    )


def _extraction_identity(pdf_path: Path, ocr_path: Path) -> tuple[str, str]:
    """Return a content key that changes when the OCR artifact arrives/changes."""
    if ocr_path.is_file():
        return f"ocr:{sha256_of_file(ocr_path)}", "paddleocr-markdown"
    return f"pdf-text:{sha256_of_file(pdf_path)}", "pymupdf-fallback"


def _source_metadata(repository: CorpusRepository, sha256: str) -> dict[str, object] | None:
    lookup = getattr(repository, "get_source_metadata", None)
    return lookup(sha256) if lookup is not None else None


def _publication_date(source: dict[str, object]) -> object | None:
    """Normalize the inventory timestamp to the date expected by ``Document``."""
    value = source.get("wp_date")
    if value is not None and hasattr(value, "date"):
        return value.date()
    return value


def _replace_content(
    repository: CorpusRepository, document: Document, pages: list, chunks: list[Chunk]
) -> None:
    replace = getattr(repository, "replace_document_content", None)
    if replace is not None:
        replace(document, pages, chunks)
        return
    repository.upsert_document(document)
    repository.upsert_pages([_page(document.document_id, page) for page in pages])
    repository.upsert_chunks(chunks)


def _page(document_id: str, page: object):
    from brh_core.models import Page

    return Page(document_id=document_id, page_number=page.page_number, text=page.text)


def _vector_record(chunk: Chunk) -> VectorRecord:
    return VectorRecord(
        id=chunk.chunk_id,
        text=chunk.text,
        metadata={
            "document_id": chunk.document_id,
            "page_number": chunk.page_number,
            "page_end": chunk.page_end,
            "chunk_type": chunk.chunk_type.value,
            "section_path": list(chunk.section_path),
            **chunk.metadata,
        },
    )
