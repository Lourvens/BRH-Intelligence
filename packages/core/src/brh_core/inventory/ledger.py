"""The inventory ledger — every read and write over ``crawl_runs`` / ``crawl_urls``.

Raw SQL on ``psycopg`` 3 (ADR-0003). Writes are idempotent: a URL is upserted
on its primary key, so re-seeing it updates state instead of duplicating a row.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from brh_core.inventory.discovery import MediaItem


@dataclass(frozen=True, slots=True)
class UrlState:
    """What the ledger currently knows about one URL."""

    url: str
    status: str
    sha256: str | None
    raw_path: str | None
    last_modified: datetime | None
    content_length: int | None


class InventoryLedger:
    """Data-access object over the inventory tables."""

    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    # --- run lifecycle -------------------------------------------------

    def start_run(
        self, *, scope: str, mode: str, watermark: datetime | None = None
    ) -> str:
        """Open a run row and return its id."""
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                INSERT INTO corpus.crawl_runs (scope, mode, watermark)
                VALUES (%s, %s, %s)
                RETURNING crawl_run_id
                """,
                (scope, mode, watermark),
            ).fetchone()
        return str(row["crawl_run_id"])

    def finish_run(
        self,
        run_id: str,
        *,
        status: str,
        counts: dict[str, int],
        error: str | None = None,
    ) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """
                UPDATE corpus.crawl_runs
                SET status = %s, counts = %s, error = %s, finished_at = now()
                WHERE crawl_run_id = %s
                """,
                (status, Jsonb(counts), error, run_id),
            )

    def watermark(self) -> datetime | None:
        """Highest WordPress ``modified_gmt`` seen — where the next incremental run starts."""
        with self._pool.connection() as conn:
            row = conn.execute(
                "SELECT max(wp_modified) AS watermark FROM corpus.crawl_urls"
            ).fetchone()
        return row["watermark"] if row else None

    # --- url state -----------------------------------------------------

    def upsert_seen(self, item: MediaItem, run_id: str) -> None:
        """Record that ``item`` was discovered in this run (idempotent)."""
        with self._pool.connection() as conn:
            conn.execute(
                """
                INSERT INTO corpus.crawl_urls (
                    url, wp_id, slug, title, wp_date, wp_modified,
                    last_seen_at, last_run_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, now(), %s)
                ON CONFLICT (url) DO UPDATE SET
                    wp_id        = EXCLUDED.wp_id,
                    slug         = EXCLUDED.slug,
                    title        = EXCLUDED.title,
                    wp_date      = EXCLUDED.wp_date,
                    wp_modified  = EXCLUDED.wp_modified,
                    last_seen_at = now(),
                    last_run_id  = EXCLUDED.last_run_id
                """,
                (
                    item.source_url,
                    item.wp_id,
                    item.slug,
                    item.title,
                    item.date_gmt,
                    item.modified_gmt,
                    run_id,
                ),
            )

    def get_url(self, url: str) -> UrlState | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT url, status, sha256, raw_path, last_modified, content_length
                FROM corpus.crawl_urls
                WHERE url = %s
                """,
                (url,),
            ).fetchone()
        if row is None:
            return None
        return UrlState(
            url=row["url"],
            status=row["status"],
            sha256=row["sha256"].strip() if row["sha256"] else None,
            raw_path=row["raw_path"],
            last_modified=row["last_modified"],
            content_length=row["content_length"],
        )

    def mark_unchanged(self, url: str, run_id: str, *, http_status: int | None) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """
                UPDATE corpus.crawl_urls
                SET status = 'unchanged', http_status = %s,
                    last_run_id = %s, error = NULL
                WHERE url = %s
                """,
                (http_status, run_id, url),
            )

    def mark_downloaded(
        self,
        url: str,
        run_id: str,
        *,
        sha256: str,
        raw_path: str,
        http_status: int | None,
        content_length: int | None,
        last_modified: datetime | None,
    ) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """
                UPDATE corpus.crawl_urls
                SET status = 'downloaded', http_status = %s, sha256 = %s,
                    raw_path = %s, content_length = %s, last_modified = %s,
                    fetched_at = now(), last_run_id = %s, error = NULL
                WHERE url = %s
                """,
                (
                    http_status,
                    sha256,
                    raw_path,
                    content_length,
                    last_modified,
                    run_id,
                    url,
                ),
            )

    def mark_failed(
        self,
        url: str,
        run_id: str,
        *,
        error: str,
        http_status: int | None = None,
        status: str = "failed",
    ) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """
                UPDATE corpus.crawl_urls
                SET status = %s, http_status = %s, error = %s, last_run_id = %s
                WHERE url = %s
                """,
                (status, http_status, error[:2000], run_id, url),
            )

    # --- reporting -----------------------------------------------------

    def stats(self) -> dict[str, Any]:
        """Counts by status, plus distinct artefacts and total known bytes."""
        with self._pool.connection() as conn:
            by_status = {
                row["status"]: row["n"]
                for row in conn.execute(
                    "SELECT status, count(*) AS n FROM corpus.crawl_urls GROUP BY status"
                ).fetchall()
            }
            row = conn.execute(
                """
                SELECT count(DISTINCT sha256) AS artefacts,
                       coalesce(sum(content_length), 0) AS bytes
                FROM corpus.crawl_urls
                WHERE sha256 IS NOT NULL
                """
            ).fetchone()
        return {
            "urls": sum(by_status.values()),
            "artefacts": int(row["artefacts"]),
            "bytes": int(row["bytes"]),
            "by_status": by_status,
        }
