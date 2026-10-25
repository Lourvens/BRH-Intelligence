"""Incremental discovery, extraction, chunk persistence and recoverable indexing."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from threading import Event, Lock

from langsmith import traceable

from brh_core.config import EmbeddingProvider, Settings
from brh_core.db.index_manifest import DocumentBusyError
from brh_core.db.repository import CorpusRepository
from brh_core.embeddings.errors import EmbeddingBlockedError
from brh_core.ingestion.artifacts import (
    IncompleteOcrArtifact,
    OcrArtifact,
    discover_ocr_markdown,
)
from brh_core.ingestion.chunk import chunk_pages
from brh_core.ingestion.chunk import chunker_id as structure_chunker_id
from brh_core.ingestion.discover import discover_pdfs
from brh_core.ingestion.extract import extract_pages
from brh_core.ingestion.indexing import IndexCoordinator
from brh_core.ingestion.langchain import chunk_to_langchain_document
from brh_core.ingestion.metadata import (
    document_id_for_sha256,
    infer_title,
    infer_volume,
    sha256_of_file,
    slugify,
)
from brh_core.models import Chunk, Document, JobStage, JobStatus, Language, SourceKind, VectorRecord
from brh_core.vectorstore.base import VectorStore

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class IngestionReport:
    documents_found: int
    documents_processed: int
    documents_skipped: int
    pages_written: int
    chunks_written: int
    failures: tuple[tuple[str, str], ...] = field(default_factory=tuple)
    documents_deferred: int = 0


class AwaitingOcr(RuntimeError):
    """A scan with no text remains eligible when its OCR artifact arrives."""


def reconcile_corpus(
    settings: Settings,
    *,
    repository,
    vector_store,
    count_tokens,
    tokenizer_id,
    limit: int | None = None,
) -> IngestionReport:
    """Repair remote records from Postgres even when source PDFs are offline."""
    if getattr(vector_store, "requires_exact_tokens", False) and (
        count_tokens is None or not tokenizer_id or "estimate" in tokenizer_id
    ):
        raise ValueError("Pinecone reconciliation requires the exact production tokenizer")
    if count_tokens is None:
        from brh_core.ingestion.chunking.tokens import estimate_tokens

        count_tokens = estimate_tokens
        tokenizer_id = tokenizer_id or settings.chunk_tokenizer_id
    ledger = repository.index_ledger()
    coordinator = IndexCoordinator(
        vector_store,
        ledger,
        target_id(settings, vector_store),
        batch_size=settings.index_batch_size,
    )
    documents = repository.list_documents()
    processed = skipped = chunks_written = 0
    failures = []
    for document in documents[:limit]:
        document_id = document.document_id
        try:
            with ledger.lock(document_id):
                # Re-read after acquiring the same lock used by ingestion.
                document = repository.get_document_by_sha256(document.sha256)
                if document is None:
                    skipped += 1
                    continue
                chunks = repository.get_chunks_for_document(document.document_id)
                if not chunks:
                    skipped += 1
                    continue
                content_key = document.metadata.get("content_key")
                if not content_key or document.metadata.get("tokenizer_id") != tokenizer_id:
                    raise ValueError("Stored chunks require ingestion with the current tokenizer")
                if document.metadata.get("chunker_id") != chunker_id(
                    settings, tokenizer_id=tokenizer_id
                ):
                    raise ValueError("Stored chunks require ingestion with the current chunker")
                if any(count_tokens(chunk.text) > _chunk_cap(settings) for chunk in chunks):
                    raise ValueError("Stored chunk exceeds current token budget; re-ingest source")
                version = (
                    f"{content_key}:{embed_id(settings)}:{settings.vector_backend.value}:"
                    f"{settings.pinecone_index_name}:{settings.pinecone_namespace}:"
                    f"{settings.pinecone_text_field}"
                )
                records = []
                for chunk in chunks:
                    projected = chunk_to_langchain_document(
                        chunk,
                        document,
                        chunker_id=document.metadata["chunker_id"],
                        tokenizer_id=tokenizer_id,
                        embedding_id=embed_id(settings),
                    )
                    records.append(
                        VectorRecord(
                            id=projected.id,
                            text=projected.page_content,
                            metadata=projected.metadata,
                        )
                    )
                metrics = coordinator.reconcile(document.document_id, version, records)
                repository.record_job(
                    document.document_id, JobStage.index, version, metrics=metrics
                )
                processed += 1
                chunks_written += len(chunks)
        except Exception as exc:
            logger.exception("Reconciliation failed for %s", document_id)
            failures.append((document_id, str(exc)))
    return IngestionReport(len(documents), processed, skipped, 0, chunks_written, tuple(failures))


def chunker_id(settings: Settings, *, tokenizer_id: str | None = None) -> str:
    return structure_chunker_id(
        max_tokens=_chunk_cap(settings),
        tokenizer_id=tokenizer_id or settings.chunk_tokenizer_id,
        **({"target_tokens": settings.chunk_target_tokens} if settings.chunk_target_tokens else {}),
    )


def embed_id(settings: Settings) -> str:
    identity = (
        f"{settings.embedding_provider.value}:{settings.embedding_model}:{settings.embedding_dim}"
    )
    if settings.embedding_provider is EmbeddingProvider.openrouter:
        from brh_core.embeddings.openrouter import QWEN_CONTRACT

        identity += ":" + QWEN_CONTRACT
    return identity


def target_id(settings: Settings, vector_store) -> str:
    return getattr(
        vector_store,
        "target_id",
        (
            f"{settings.vector_backend.value}:{settings.pinecone_index_name}:"
            f"{settings.pinecone_namespace}:{embed_id(settings)}"
        ),
    )


def index_key(
    sha256: str,
    settings: Settings,
    *,
    tokenizer_id: str | None = None,
    extraction_key: str = "unknown-extraction",
) -> str:
    return (
        f"{sha256}:{extraction_key}:{chunker_id(settings, tokenizer_id=tokenizer_id)}:"
        f"{embed_id(settings)}:{settings.vector_backend.value}:"
        f"{settings.pinecone_index_name}:{settings.pinecone_namespace}:"
        f"{settings.pinecone_text_field}"
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
    index_ledger=None,
    reconcile: bool = False,
    from_ocr: bool = False,
    workers: int | None = None,
    stop: Event | None = None,
) -> IngestionReport:
    """Resume changed documents; a bounded pass advances beyond completed files."""
    if limit is not None and limit < 0:
        raise ValueError("limit must be non-negative")
    worker_count = settings.ingestion_workers if workers is None else workers
    if not 1 <= worker_count <= 16:
        raise ValueError("workers must be between 1 and 16")
    if getattr(vector_store, "requires_exact_tokens", False) and (
        count_tokens is None or not tokenizer_id or "estimate" in tokenizer_id
    ):
        raise ValueError("Pinecone indexing requires the exact production tokenizer")
    ledger = index_ledger or repository.index_ledger()
    coordinator = (
        IndexCoordinator(
            vector_store,
            ledger,
            target_id(settings, vector_store),
            batch_size=settings.index_batch_size,
        )
        if vector_store is not None
        else None
    )
    paths = (
        discover_ocr_markdown(settings.resolved_ocr_dir)
        if from_ocr
        else discover_pdfs(raw_dir or settings.resolved_raw_dir)
    )
    from brh_core.ingestion.scheduling import bounded_results

    processed = skipped = pages_written = chunks_written = deferred = 0
    failures = []
    seen = set()
    seen_lock = Lock()

    def process(pdf_path):
        try:
            artifact = OcrArtifact.load(pdf_path) if from_ocr else None
            sha = artifact.sha256 if artifact else sha256_of_file(pdf_path)
            with seen_lock:
                if sha in seen:
                    return "skipped", None
                seen.add(sha)
            with ledger.lock(document_id_for_sha256(sha)):
                result = _ingest_document(
                    settings,
                    repository=repository,
                    coordinator=coordinator,
                    pdf_path=pdf_path,
                    sha256=sha,
                    force=force,
                    reconcile=reconcile,
                    count_tokens=count_tokens,
                    tokenizer_id=tokenizer_id,
                    artifact=artifact,
                )
        except (AwaitingOcr, IncompleteOcrArtifact, DocumentBusyError):
            return "deferred", None
        except EmbeddingBlockedError:
            if stop is not None:
                stop.set()
            raise
        except Exception as exc:
            logger.exception("Ingestion failed for %s", pdf_path)
            return "failed", (str(pdf_path), str(exc))
        if result is not None:
            logger.info("Document verified sha256=%s pages=%d chunks=%d", sha, result[0], result[1])
        return ("skipped", None) if result is None else ("processed", result)

    for status, result in bounded_results(
        paths,
        process,
        workers=worker_count,
        limit=limit,
        stop=stop,
        successful=lambda outcome: outcome[0] == "processed",
    ):
        if status == "skipped":
            skipped += 1
        elif status == "deferred":
            deferred += 1
        elif status == "failed":
            failures.append(result)
        else:
            processed += 1
            pages_written += result[0]
            chunks_written += result[1]
    return IngestionReport(
        len(paths), processed, skipped, pages_written, chunks_written, tuple(failures), deferred
    )


@traceable(
    name="brh.ingestion.document",
    process_inputs=lambda values: {
        "sha256": values.get("sha256"),
        "path": str(values.get("pdf_path")),
        "tokenizer_id": values.get("tokenizer_id"),
        "force": values.get("force"),
        "reconcile": values.get("reconcile"),
    },
)
def _ingest_document(
    settings: Settings,
    *,
    repository,
    coordinator,
    pdf_path,
    sha256,
    force,
    reconcile,
    count_tokens,
    tokenizer_id,
    artifact: OcrArtifact | None = None,
):
    existing = repository.get_document_by_sha256(sha256)
    document_id = existing.document_id if existing else document_id_for_sha256(sha256)
    if artifact is not None:
        pdf_path = settings.web_store_dir / f"{sha256}.pdf"
    ocr_path = artifact.markdown if artifact else settings.resolved_ocr_dir / sha256 / "document.md"
    extraction_key, extraction_source = _extraction_identity(pdf_path, ocr_path)
    content_key = f"{sha256}:{extraction_key}:{chunker_id(settings, tokenizer_id=tokenizer_id)}"
    version = index_key(sha256, settings, tokenizer_id=tokenizer_id, extraction_key=extraction_key)
    has_content = bool(
        existing
        and existing.metadata.get("content_key") == content_key
        and repository.job_succeeded(document_id, JobStage.chunk, content_key)
    )
    needs_index = coordinator is not None and (
        not coordinator.succeeded(document_id, version)
        or not repository.job_succeeded(document_id, JobStage.index, version)
    )
    if not force and has_content and not needs_index and not reconcile:
        return None
    pages = []
    chunks = []
    document = existing
    stage = JobStage.extract
    try:
        if force or not has_content:
            if coordinator and existing:
                coordinator.remember(
                    document_id,
                    [chunk.chunk_id for chunk in repository.get_chunks_for_document(document_id)],
                )
            if existing is None:
                document = _build_document(
                    settings,
                    repository,
                    pdf_path,
                    sha256,
                    document_id,
                    None,
                    0,
                    extraction_source=extraction_source,
                )
                repository.upsert_document(document)
            pages = (
                artifact.read_pages()
                if artifact
                else extract_pages(pdf_path, ocr_markdown=ocr_path)
            )
            if not any(page.text.strip() for page in pages):
                repository.record_job(
                    document_id,
                    stage,
                    extraction_key,
                    status=JobStatus.pending,
                    error="Awaiting readable OCR",
                )
                raise AwaitingOcr(document_id)
            if _extraction_identity(pdf_path, ocr_path)[0] != extraction_key:
                raise RuntimeError("Extraction artifact changed while being read; retry")
            stage = JobStage.chunk
            chunks = chunk_pages(
                document_id,
                pages,
                max_tokens=_chunk_cap(settings),
                count_tokens=count_tokens,
                **(
                    {"target_tokens": settings.chunk_target_tokens}
                    if settings.chunk_target_tokens
                    else {}
                ),
            )
            if not chunks:
                raise ValueError("Extraction produced text but no retrievable chunks")
            if count_tokens and any(
                count_tokens(chunk.text) > _chunk_cap(settings) for chunk in chunks
            ):
                raise ValueError("Chunk exceeds exact token budget")
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
            document = document.model_copy(
                update={
                    "metadata": {
                        **document.metadata,
                        "content_key": content_key,
                        "chunker_id": chunker_id(settings, tokenizer_id=tokenizer_id),
                        "tokenizer_id": tokenizer_id or settings.chunk_tokenizer_id,
                    }
                }
            )
            if artifact is not None:
                local_path = (
                    str(pdf_path)
                    if pdf_path.is_file()
                    else (existing.source_path if existing else None)
                )
                if not local_path:
                    title = next(
                        (
                            page.text.splitlines()[0].lstrip("# ").strip()
                            for page in pages
                            if page.text.strip()
                        ),
                        document.title,
                    )
                    if document.title == infer_title(sha256):
                        document = document.model_copy(update={"title": title[:240]})
                document = document.model_copy(
                    update={
                        "source_path": local_path,
                        "metadata": {
                            **document.metadata,
                            "ocr_artifact": str(ocr_path),
                            "ocr_engine": artifact.metadata["engine"],
                            "ocr_engine_version": artifact.metadata.get("engine_version"),
                        },
                    }
                )
            _replace_content(repository, document, pages, chunks)
            repository.record_job(
                document_id,
                JobStage.extract,
                extraction_key,
                metrics={"pages": len(pages), "source": extraction_source},
            )
            repository.record_job(
                document_id, JobStage.chunk, content_key, metrics={"chunks": len(chunks)}
            )
        elif coordinator:
            chunks = repository.get_chunks_for_document(document_id)
        if coordinator:
            stage = JobStage.index
            records = []
            for chunk in chunks:
                projected = chunk_to_langchain_document(
                    chunk,
                    document,
                    chunker_id=chunker_id(settings, tokenizer_id=tokenizer_id),
                    tokenizer_id=tokenizer_id or settings.chunk_tokenizer_id,
                    embedding_id=embed_id(settings),
                )
                records.append(
                    VectorRecord(
                        id=projected.id, text=projected.page_content, metadata=projected.metadata
                    )
                )
            metrics = coordinator.reconcile(document_id, version, records)
            repository.record_job(document_id, stage, version, metrics=metrics)
            logger.info(
                "Indexed document=%s chunks=%s written=%s reused=%s deleted=%s",
                document_id,
                len(records),
                metrics.get("vectors_written"),
                metrics.get("vectors_reused"),
                metrics.get("stale_vectors_deleted"),
            )
    except AwaitingOcr:
        raise
    except Exception as exc:
        try:
            if document is not None:
                repository.record_job(
                    document_id,
                    stage,
                    version if stage is JobStage.index else content_key,
                    status=JobStatus.failed,
                    error=str(exc),
                )
        except Exception:
            logger.exception("Could not record failed %s job for %s", stage, document_id)
        raise
    return len(pages), len(chunks)


def _chunk_cap(settings: Settings) -> int:
    """Keep content below the model limit, including a configurable reserve."""
    if settings.chunk_max_tokens is not None:
        settings.validate_chunk_limits()
        return settings.chunk_max_tokens
    safe_limit = max(1, settings.model_token_limit - settings.chunk_token_reserve)
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
        source_slug if owner is None or owner.sha256 == sha256 else f"{source_slug}-{sha256[:12]}"
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
        metadata={
            **(existing.metadata if existing else {}),
            "extraction_source": extraction_source,
        },
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
        replace(document, [_page(document.document_id, page) for page in pages], chunks)
        return
    repository.upsert_document(document)
    repository.upsert_pages([_page(document.document_id, page) for page in pages])
    repository.upsert_chunks(chunks)


def _page(document_id: str, page: object):
    from brh_core.models import Page

    return Page(document_id=document_id, page_number=page.page_number, text=page.text)
