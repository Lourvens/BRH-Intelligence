"""Ingestion pipeline — orchestrate discovery, extraction, chunking, indexing.

Idempotency (ADR-0003): the ``index`` stage is keyed by
``{sha256}:{chunker_id}:{embed_id}``. Re-running without ``force`` skips a
document whose index job already succeeded for the same key, so a chunker or
embedding-model change is the *only* thing that triggers re-indexing.

TODO: implement ``run_ingestion``. Per-document steps, each recording a
``processing_jobs`` row through the repository:

1. ``sha256`` the file; look up an existing document by hash (reuse its
   ``document_id`` so chunk ids stay stable).
2. skip when ``force`` is false and the ``index`` job already succeeded.
3. extract pages -> build+upsert the :class:`~brh_core.models.Document`
   (with ``page_count``) -> upsert pages (``extract`` job).
4. chunk -> upsert chunks (``chunk`` job).
5. build ``VectorRecord`` per chunk -> ``vector_store.upsert(...)``
   (``index`` job).

Contain per-file errors: record a failed job and continue, collecting
``(filename, error)`` into the report.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from brh_core.config import Settings
from brh_core.db.repository import CorpusRepository
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


def chunker_id(settings: Settings) -> str:
    """Stable id for the chunking strategy, e.g. ``recursive:1000:150``."""
    raise NotImplementedError("TODO: encode chunk_size/chunk_overlap")


def embed_id(settings: Settings) -> str:
    """Stable id for the embedding strategy, e.g. ``pinecone:multilingual-e5-large``."""
    raise NotImplementedError("TODO: encode embedding provider/model")


def index_key(sha256: str, settings: Settings) -> str:
    """Idempotency key for the ``index`` stage: ``{sha}:{chunker}:{embed}``."""
    raise NotImplementedError("TODO: compose the index key")


def run_ingestion(
    settings: Settings,
    *,
    repository: CorpusRepository,
    vector_store: VectorStore,
    raw_dir: Path | None = None,
    force: bool = False,
    limit: int | None = None,
) -> IngestionReport:
    """Ingest every discovered PDF; contain per-file errors."""
    raise NotImplementedError("TODO: implement the ingestion loop")
