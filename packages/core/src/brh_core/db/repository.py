"""Corpus repository — every read and write the pipeline and services need.

Raw SQL on ``psycopg`` 3 (ADR-0003). No ORM.

TODO: implement. The schema is fixed by ``db/migrations/0001_init.sql``; write
parameterized statements only. Every write must be idempotent (the schema's
unique constraints are the gate).
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Any

from psycopg_pool import ConnectionPool

from brh_core.models import Chunk, Document, JobStage, JobStatus, Page


class CorpusRepository:
    """Thin, explicit data-access object over a psycopg connection pool."""

    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    # --- documents -----------------------------------------------------

    def upsert_document(self, document: Document) -> None:
        """Insert or refresh a document, keyed by its content hash (``sha256``)."""
        raise NotImplementedError("TODO: INSERT ... ON CONFLICT (sha256) DO UPDATE")

    def get_document(self, document_id: str) -> Document | None:
        raise NotImplementedError("TODO: SELECT by document_id")

    def get_document_by_slug(self, slug: str) -> Document | None:
        raise NotImplementedError("TODO: SELECT by slug")

    def get_document_by_sha256(self, sha256: str) -> Document | None:
        raise NotImplementedError("TODO: SELECT by sha256")

    def list_documents(self) -> list[Document]:
        raise NotImplementedError("TODO: SELECT all documents")

    def get_documents(self, document_ids: Iterable[str]) -> dict[str, Document]:
        """Bulk lookup keyed by ``document_id`` (used by citation building)."""
        raise NotImplementedError("TODO: SELECT ... WHERE document_id = ANY(%s)")

    # --- pages ---------------------------------------------------------

    def upsert_pages(self, pages: Sequence[Page]) -> int:
        """Persist page text; returns the number written."""
        raise NotImplementedError("TODO: INSERT ... ON CONFLICT (document_id, page_number)")

    def get_page(self, document_id: str, page_number: int) -> Page | None:
        raise NotImplementedError("TODO: SELECT one page")

    # --- chunks --------------------------------------------------------

    def upsert_chunks(self, chunks: Sequence[Chunk]) -> int:
        """Persist chunks; returns the number written."""
        raise NotImplementedError("TODO: INSERT ... ON CONFLICT (chunk_id)")

    def get_chunks(self, chunk_ids: Iterable[str]) -> dict[str, Chunk]:
        raise NotImplementedError("TODO: SELECT ... WHERE chunk_id = ANY(%s)")

    def count_chunks(self) -> int:
        raise NotImplementedError("TODO: SELECT count(*)")

    # --- processing jobs (idempotency ledger) --------------------------

    def record_job(
        self,
        document_id: str,
        stage: JobStage,
        idempotency_key: str,
        *,
        status: JobStatus = JobStatus.succeeded,
        metrics: dict[str, object] | None = None,
        error: str | None = None,
    ) -> None:
        """Append/refresh one job row keyed by ``(document, stage, key)``."""
        raise NotImplementedError(
            "TODO: INSERT ... ON CONFLICT (document_id, stage, idempotency_key)"
        )

    def job_succeeded(self, document_id: str, stage: JobStage, idempotency_key: str) -> bool:
        """True when this exact unit of work already completed successfully."""
        raise NotImplementedError("TODO: SELECT 1 ... status = 'succeeded'")

    def stats(self) -> dict[str, int]:
        """``{"documents": n, "pages": n, "chunks": n}``."""
        raise NotImplementedError("TODO: counts for the three tables")


def row_to_document(row: dict[str, Any]) -> Document:
    """Map a ``dict_row`` from ``documents`` to a :class:`Document`.

    Hint: Postgres returns ``document_id`` as a ``uuid`` — cast to ``str`` —
    and ``sha256`` as a padded ``char(64)`` — strip it.
    """
    raise NotImplementedError("TODO: row -> Document")
