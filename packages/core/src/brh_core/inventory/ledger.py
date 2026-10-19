"""The inventory ledger — every read and write over ``crawl_runs`` / ``crawl_urls``.

Raw SQL on ``psycopg`` 3 (ADR-0003). Writes are idempotent: a URL is upserted on
its primary key, so re-seeing it refreshes state instead of duplicating a row.

Two phases use this object:

* **catalogue** — record every document the site lists (new ones arrive as
  ``pending``; a document whose WordPress ``wp_modified`` moved is re-queued);
* **queue** — the rows still needing work (``pending`` / ``failed``), ordered.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from brh_core.inventory.discovery import MediaItem

_CATALOGUE_SQL = """
    INSERT INTO corpus.crawl_urls (
        url, wp_id, slug, title, wp_date, wp_modified, content_length,
        last_seen_at, last_run_id
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, now(), %s)
    ON CONFLICT (url) DO UPDATE SET
        wp_id        = EXCLUDED.wp_id,
        slug         = EXCLUDED.slug,
        title        = EXCLUDED.title,
        wp_date      = EXCLUDED.wp_date,
        wp_modified  = EXCLUDED.wp_modified,
        last_seen_at = now(),
        last_run_id  = EXCLUDED.last_run_id,
        -- the declared size (from WP) is only a fallback; once a document has
        -- been downloaded its observed size is authoritative and left alone.
        content_length = coalesce(crawl_urls.content_length, EXCLUDED.content_length),
        -- a document that changed is re-queued for download; otherwise keep
        -- whatever status it already had (so nothing resolved is redone).
        status       = CASE
            WHEN EXCLUDED.wp_modified IS DISTINCT FROM crawl_urls.wp_modified
            THEN 'pending'
            ELSE crawl_urls.status
        END
"""


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

    def start_run(self, *, scope: str, mode: str, watermark: datetime | None = None) -> str:
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

    def url_count(self) -> int:
        with self._pool.connection() as conn:
            row = conn.execute("SELECT count(*) AS n FROM corpus.crawl_urls").fetchone()
        return int(row["n"])

    # --- catalogue + queue ---------------------------------------------

    def catalogue(self, items: Iterable[MediaItem], run_id: str) -> int:
        """Record every listed document; return how many URLs are new."""
        rows = [
            (
                item.source_url,
                item.wp_id,
                item.slug,
                item.title,
                item.date_gmt,
                item.modified_gmt,
                item.filesize,
                run_id,
            )
            for item in items
            if item.source_url
        ]
        if not rows:
            return 0
        with self._pool.connection() as conn:
            before = conn.execute("SELECT count(*) AS n FROM corpus.crawl_urls").fetchone()["n"]
            with conn.cursor() as cursor:
                cursor.executemany(_CATALOGUE_SQL, rows)
            after = conn.execute("SELECT count(*) AS n FROM corpus.crawl_urls").fetchone()["n"]
        return int(after - before)

    def queue(
        self,
        *,
        limit: int | None = None,
        since: datetime | None = None,
        include_resolved: bool = False,
    ) -> list[str]:
        """URLs that still need a download, in ``(wp_modified, url)`` order.

        Only unresolved rows (``pending`` / ``failed``) are returned unless
        ``include_resolved`` is set (``--force``); ``since`` narrows the window
        to documents modified after it.
        """
        with self._pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT url
                FROM corpus.crawl_urls
                WHERE (%(include)s::boolean OR status IN ('pending', 'failed'))
                  AND (%(since)s::timestamptz IS NULL OR wp_modified > %(since)s::timestamptz)
                ORDER BY wp_modified ASC NULLS FIRST, url ASC
                LIMIT %(limit)s
                """,
                {"include": include_resolved, "since": since, "limit": limit},
            ).fetchall()
        return [row["url"] for row in rows]

    def sample_candidates(self, *, since: datetime | None = None) -> list[tuple[str, int | None]]:
        """Unresolved rows as ``(url, publication year)``, oldest modified first.

        Input for :func:`brh_core.inventory.pipeline.stratified_sample`. Ordering
        decides which document represents its year, so it is deterministic.
        """
        with self._pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT url, extract(year FROM wp_date)::int AS year
                FROM corpus.crawl_urls
                WHERE status IN ('pending', 'failed')
                  AND (%(since)s::timestamptz IS NULL
                       OR wp_modified > %(since)s::timestamptz)
                ORDER BY wp_modified ASC NULLS FIRST, url ASC
                """,
                {"since": since},
            ).fetchall()
        return [(row["url"], row["year"]) for row in rows]

    def resolved_urls(self) -> set[str]:
        """URLs already dealt with — used by ``--dry-run`` to preview the queue."""
        with self._pool.connection() as conn:
            rows = conn.execute(
                "SELECT url FROM corpus.crawl_urls"
                " WHERE status IN ('downloaded', 'unchanged', 'gone')"
            ).fetchall()
        return {row["url"] for row in rows}

    # --- url state -----------------------------------------------------

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
                       coalesce(sum(content_length) FILTER (WHERE sha256 IS NOT NULL), 0) AS bytes,
                       count(*) FILTER (WHERE status IN ('pending', 'failed')
                                          AND content_length IS NOT NULL) AS outstanding_sized,
                       coalesce(
                           sum(content_length) FILTER (WHERE status IN ('pending', 'failed')), 0
                       ) AS outstanding_bytes
                FROM corpus.crawl_urls
                """
            ).fetchone()
        return {
            "urls": sum(by_status.values()),
            "artefacts": int(row["artefacts"]),
            "bytes": int(row["bytes"]),
            "outstanding": by_status.get("pending", 0) + by_status.get("failed", 0),
            "outstanding_sized": int(row["outstanding_sized"]),
            "outstanding_bytes": int(row["outstanding_bytes"]),
            "by_status": by_status,
        }
