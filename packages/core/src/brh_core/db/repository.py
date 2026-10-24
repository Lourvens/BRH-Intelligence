"""Corpus repository — every read and write the pipeline and services need.

Raw SQL on ``psycopg`` 3 (ADR-0003). No ORM.

The schema is fixed by migrations; writes are parameterized and idempotent.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Any

from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from brh_core.models import Chunk, Document, JobStage, JobStatus, Page


class CorpusRepository:
    """Thin, explicit data-access object over a psycopg connection pool."""

    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def index_ledger(self):
        from brh_core.db.index_manifest import PostgresIndexLedger

        return PostgresIndexLedger(self._pool)

    # --- documents -----------------------------------------------------

    def upsert_document(self, document: Document) -> None:
        """Insert or refresh a document, keyed by its content hash (``sha256``)."""
        with self._pool.connection() as conn:
            conn.execute(
                """
                INSERT INTO corpus.documents (
                    document_id, sha256, slug, title, source_kind, language, publisher,
                    source_path, source_url, volume, issue, publication_date, page_count, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (sha256) DO UPDATE SET
                    slug = EXCLUDED.slug, title = EXCLUDED.title,
                    source_kind = EXCLUDED.source_kind, language = EXCLUDED.language,
                    publisher = EXCLUDED.publisher, source_path = EXCLUDED.source_path,
                    source_url = EXCLUDED.source_url, volume = EXCLUDED.volume,
                    issue = EXCLUDED.issue, publication_date = EXCLUDED.publication_date,
                    page_count = EXCLUDED.page_count, metadata = EXCLUDED.metadata,
                    last_seen_at = now()
                """,
                _document_values(document),
            )

    def get_document(self, document_id: str) -> Document | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                "SELECT * FROM corpus.documents WHERE document_id = %s", (document_id,)
            ).fetchone()
        return row_to_document(row) if row else None

    def get_document_by_slug(self, slug: str) -> Document | None:
        with self._pool.connection() as conn:
            row = conn.execute("SELECT * FROM corpus.documents WHERE slug = %s", (slug,)).fetchone()
        return row_to_document(row) if row else None

    def get_document_by_sha256(self, sha256: str) -> Document | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                "SELECT * FROM corpus.documents WHERE sha256 = %s", (sha256,)
            ).fetchone()
        return row_to_document(row) if row else None

    def get_source_metadata(self, sha256: str) -> dict[str, Any] | None:
        """Return deterministic source metadata from inventory aliases."""
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT title, slug, url AS source_url, wp_date
                FROM corpus.crawl_urls
                WHERE sha256 = %s
                ORDER BY url
                LIMIT 1
                """,
                (sha256,),
            ).fetchone()
        return dict(row) if row else None

    def list_documents(self) -> list[Document]:
        with self._pool.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM corpus.documents ORDER BY title, document_id"
            ).fetchall()
        return [row_to_document(row) for row in rows]

    def get_documents(self, document_ids: Iterable[str]) -> dict[str, Document]:
        """Bulk lookup keyed by ``document_id`` (used by citation building)."""
        ids = list(document_ids)
        if not ids:
            return {}
        with self._pool.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM corpus.documents WHERE document_id = ANY(%s)", (ids,)
            ).fetchall()
        documents = [row_to_document(row) for row in rows]
        return {document.document_id: document for document in documents}

    # --- pages ---------------------------------------------------------

    def upsert_pages(self, pages: Sequence[Page]) -> int:
        """Persist page text; returns the number written."""
        rows = [(_page_values(page)) for page in pages]
        if not rows:
            return 0
        with self._pool.connection() as conn, conn.cursor() as cursor:
            cursor.executemany(
                """
                    INSERT INTO corpus.pages (document_id, page_number, text)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (document_id, page_number) DO UPDATE SET text = EXCLUDED.text
                    """,
                rows,
            )
        return len(rows)

    def get_page(self, document_id: str, page_number: int) -> Page | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT document_id, page_number, text
                FROM corpus.pages
                WHERE document_id = %s AND page_number = %s
                """,
                (document_id, page_number),
            ).fetchone()
        return row_to_page(row) if row else None

    # --- chunks --------------------------------------------------------

    def upsert_chunks(self, chunks: Sequence[Chunk]) -> int:
        """Persist chunks; returns the number written."""
        rows = [_chunk_values(chunk) for chunk in chunks]
        if not rows:
            return 0
        with self._pool.connection() as conn, conn.cursor() as cursor:
            cursor.executemany(
                """
                    INSERT INTO corpus.chunks (
                        chunk_id, document_id, page_number, ordinal, text, char_count,
                        page_end, chunk_type, section_path, token_count, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (chunk_id) DO UPDATE SET
                        document_id = EXCLUDED.document_id, page_number = EXCLUDED.page_number,
                        ordinal = EXCLUDED.ordinal, text = EXCLUDED.text,
                        char_count = EXCLUDED.char_count, page_end = EXCLUDED.page_end,
                        chunk_type = EXCLUDED.chunk_type, section_path = EXCLUDED.section_path,
                        token_count = EXCLUDED.token_count, metadata = EXCLUDED.metadata
                    """,
                rows,
            )
        return len(rows)

    def get_chunks(self, chunk_ids: Iterable[str]) -> dict[str, Chunk]:
        ids = list(chunk_ids)
        if not ids:
            return {}
        with self._pool.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM corpus.chunks WHERE chunk_id = ANY(%s)", (ids,)
            ).fetchall()
        chunks = [row_to_chunk(row) for row in rows]
        return {chunk.chunk_id: chunk for chunk in chunks}

    def get_chunks_for_document(self, document_id: str) -> list[Chunk]:
        with self._pool.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM corpus.chunks WHERE document_id = %s ORDER BY page_number, ordinal",
                (document_id,),
            ).fetchall()
        return [row_to_chunk(row) for row in rows]

    def count_chunks(self) -> int:
        with self._pool.connection() as conn:
            row = conn.execute("SELECT count(*) AS n FROM corpus.chunks").fetchone()
        return int(row["n"])

    def replace_document_content(
        self, document: Document, pages: Sequence[Page], chunks: Sequence[Chunk]
    ) -> None:
        """Atomically replace extracted pages and chunks for one document."""
        with self._pool.connection() as conn, conn.transaction():
                conn.execute(
                    """
                    INSERT INTO corpus.documents (
                        document_id, sha256, slug, title, source_kind, language, publisher,
                    source_path, source_url, volume, issue, publication_date,
                    page_count, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sha256) DO UPDATE SET
                    slug = EXCLUDED.slug, title = EXCLUDED.title,
                    page_count = EXCLUDED.page_count,
                        source_path = EXCLUDED.source_path, metadata = EXCLUDED.metadata,
                        last_seen_at = now()
                    """,
                    _document_values(document),
                )
                conn.execute(
                    "DELETE FROM corpus.pages WHERE document_id = %s", (document.document_id,)
                )
                conn.execute(
                    "DELETE FROM corpus.chunks WHERE document_id = %s", (document.document_id,)
                )
                with conn.cursor() as cursor:
                    cursor.executemany(
                        """
                        INSERT INTO corpus.pages (document_id, page_number, text)
                        VALUES (%s, %s, %s)
                        """,
                        [_page_values(page) for page in pages],
                    )
                    cursor.executemany(
                        """
                        INSERT INTO corpus.chunks (
                            chunk_id, document_id, page_number, ordinal, text, char_count,
                            page_end, chunk_type, section_path, token_count, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        [_chunk_values(chunk) for chunk in chunks],
                    )

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
        with self._pool.connection() as conn:
            conn.execute(
                """
                INSERT INTO corpus.processing_jobs (
                    document_id, stage, idempotency_key, status, finished_at, error, metrics
                ) VALUES (
                    %s, %s, %s, %s,
                    CASE WHEN %s IN ('succeeded', 'failed') THEN now() ELSE NULL END,
                    %s, %s
                )
                ON CONFLICT (document_id, stage, idempotency_key) DO UPDATE SET
                    status = EXCLUDED.status, finished_at = EXCLUDED.finished_at,
                    error = EXCLUDED.error, metrics = EXCLUDED.metrics,
                    attempt = corpus.processing_jobs.attempt + 1, started_at = now()
                """,
                (
                    document_id,
                    stage.value,
                    idempotency_key,
                    status.value,
                    status.value,
                    error,
                    Jsonb(metrics or {}),
                ),
            )

    def job_succeeded(self, document_id: str, stage: JobStage, idempotency_key: str) -> bool:
        """True when this exact unit of work already completed successfully."""
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT 1 FROM corpus.processing_jobs
                WHERE document_id = %s AND stage = %s
                  AND idempotency_key = %s AND status = 'succeeded'
                """,
                (document_id, stage.value, idempotency_key),
            ).fetchone()
        return row is not None

    def stats(self) -> dict[str, int]:
        """``{"documents": n, "pages": n, "chunks": n}``."""
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT
                    (SELECT count(*) FROM corpus.documents) AS documents,
                    (SELECT count(*) FROM corpus.pages) AS pages,
                    (SELECT count(*) FROM corpus.chunks) AS chunks
                """
            ).fetchone()
        return {key: int(row[key]) for key in ("documents", "pages", "chunks")}


def row_to_document(row: dict[str, Any]) -> Document:
    """Map a ``dict_row`` from ``documents`` to a :class:`Document`.

    Hint: Postgres returns ``document_id`` as a ``uuid`` — cast to ``str`` —
    and ``sha256`` as a padded ``char(64)`` — strip it.
    """
    return Document(
        document_id=str(row["document_id"]),
        sha256=str(row["sha256"]).strip(),
        slug=row["slug"],
        title=row["title"],
        source_kind=row["source_kind"],
        language=row["language"],
        publisher=row["publisher"],
        source_path=row["source_path"],
        source_url=row["source_url"],
        volume=row["volume"],
        issue=row["issue"],
        publication_date=row["publication_date"],
        page_count=row["page_count"],
        first_seen_at=row["first_seen_at"],
        last_seen_at=row["last_seen_at"],
        metadata=row["metadata"] or {},
    )


def row_to_page(row: dict[str, Any]) -> Page:
    return Page(
        document_id=str(row["document_id"]), page_number=row["page_number"], text=row["text"]
    )


def row_to_chunk(row: dict[str, Any]) -> Chunk:
    from brh_core.models import ChunkType

    return Chunk(
        chunk_id=row["chunk_id"],
        document_id=str(row["document_id"]),
        page_number=row["page_number"],
        ordinal=row["ordinal"],
        text=row["text"],
        page_end=row["page_end"],
        chunk_type=ChunkType(row["chunk_type"]),
        section_path=tuple(row["section_path"] or ()),
        token_count=row["token_count"],
        metadata=row["metadata"] or {},
    )


def _document_values(document: Document) -> tuple[Any, ...]:
    return (
        document.document_id,
        document.sha256,
        document.slug,
        document.title,
        document.source_kind.value,
        document.language.value,
        document.publisher,
        document.source_path,
        document.source_url,
        document.volume,
        document.issue,
        document.publication_date,
        document.page_count,
        Jsonb(document.metadata),
    )


def _page_values(page: Page) -> tuple[Any, ...]:
    return page.document_id, page.page_number, page.text


def _chunk_values(chunk: Chunk) -> tuple[Any, ...]:
    return (
        chunk.chunk_id,
        chunk.document_id,
        chunk.page_number,
        chunk.ordinal,
        chunk.text,
        chunk.char_count,
        chunk.page_end,
        chunk.chunk_type.value,
        list(chunk.section_path),
        chunk.token_count,
        Jsonb(chunk.metadata),
    )
