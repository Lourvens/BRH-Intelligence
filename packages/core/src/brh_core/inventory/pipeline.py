"""The inventory pipeline — discover, download, and log every BRH document.

One pass:

1. enumerate PDFs via the WordPress media API (optionally only those modified
   since a watermark — the incremental run);
2. for each URL, ``HEAD`` for a cheap change signal, and skip it when the ledger
   already holds the same ``(last_modified, content_length)`` and the bytes are
   on disk;
3. otherwise stream the file into the content-addressed store, hashing as we go;
4. record the outcome on the URL row.

Nothing here parses PDFs — the inventory ends when bytes are on disk with a
ledger row. Parsing/chunking/indexing is a later stage that consumes it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from brh_core.config import Settings
from brh_core.inventory.discovery import WordPressMediaClient
from brh_core.inventory.ledger import InventoryLedger
from brh_core.inventory.store import ContentStore

DEFAULT_SCOPE = "brh.ht/media/pdf"


@dataclass(frozen=True, slots=True)
class InventoryReport:
    """Outcome of one inventory run."""

    run_id: str
    mode: str
    discovered: int = 0
    downloaded: int = 0
    duplicated: int = 0
    unchanged: int = 0
    failed: int = 0
    bytes_written: int = 0
    failures: tuple[tuple[str, str], ...] = field(default_factory=tuple)

    @property
    def counts(self) -> dict[str, int]:
        return {
            "discovered": self.discovered,
            "downloaded": self.downloaded,
            "duplicated": self.duplicated,
            "unchanged": self.unchanged,
            "failed": self.failed,
            "bytes_written": self.bytes_written,
        }


def run_inventory(
    settings: Settings,
    *,
    ledger: InventoryLedger,
    client: WordPressMediaClient | None = None,
    store: ContentStore | None = None,
    since: datetime | None = None,
    limit: int | None = None,
    force: bool = False,
    dry_run: bool = False,
    scope: str = DEFAULT_SCOPE,
) -> InventoryReport:
    """Run one inventory pass; contain per-URL errors and keep going."""
    client = client or WordPressMediaClient.from_settings(settings)
    store = store or ContentStore(settings.web_store_dir)
    mode = "incremental" if since is not None else "bulk"

    run_id = "dry-run" if dry_run else ledger.start_run(scope=scope, mode=mode, watermark=since)

    discovered = downloaded = duplicated = unchanged = failed = bytes_written = 0
    failures: list[tuple[str, str]] = []

    def record_failure(
        url: str, message: str, http_status: int | None, status: str = "failed"
    ) -> None:
        nonlocal failed
        failed += 1
        failures.append((url, message))
        if not dry_run:
            ledger.mark_failed(url, run_id, error=message, http_status=http_status, status=status)

    try:
        for item in client.iter_pdfs(modified_after=since):
            if limit is not None and discovered >= limit:
                break
            discovered += 1
            url = item.source_url
            if not url:
                continue

            if not dry_run:
                ledger.upsert_seen(item, run_id)
            state = ledger.get_url(url)

            try:
                stat = client.stat(url)
            except Exception as exc:  # one bad URL must not stop the run
                record_failure(url, f"HEAD failed: {exc}", None)
                continue

            if stat.status_code == 404:
                record_failure(url, "HTTP 404 not found", 404, status="gone")
                continue
            if stat.status_code != 200:
                record_failure(url, f"HTTP {stat.status_code}", stat.status_code)
                continue

            already_current = (
                state is not None
                and state.sha256 is not None
                and state.raw_path is not None
                and store.has(state.sha256)
                and stat.last_modified is not None
                and stat.last_modified == state.last_modified
                and stat.content_length == state.content_length
            )

            if already_current and not force:
                unchanged += 1
                if not dry_run:
                    ledger.mark_unchanged(url, run_id, http_status=stat.status_code)
                continue

            if dry_run:
                downloaded += 1  # planned
                continue

            try:
                with client.stream(url) as response:
                    response.raise_for_status()
                    saved = store.save(response.iter_bytes())
            except Exception as exc:
                record_failure(url, f"download failed: {exc}", stat.status_code)
                continue

            if saved.created:
                downloaded += 1
                bytes_written += saved.size
            else:
                duplicated += 1

            ledger.mark_downloaded(
                url,
                run_id,
                sha256=saved.sha256,
                raw_path=str(saved.path),
                http_status=stat.status_code,
                content_length=stat.content_length or saved.size,
                last_modified=stat.last_modified,
            )
    except Exception as exc:
        if not dry_run:
            ledger.finish_run(run_id, status="failed", counts={}, error=str(exc))
        raise

    report = InventoryReport(
        run_id=run_id,
        mode=mode,
        discovered=discovered,
        downloaded=downloaded,
        duplicated=duplicated,
        unchanged=unchanged,
        failed=failed,
        bytes_written=bytes_written,
        failures=tuple(failures),
    )

    if not dry_run:
        ledger.finish_run(run_id, status="succeeded", counts=report.counts)

    return report
