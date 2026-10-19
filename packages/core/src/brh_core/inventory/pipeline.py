"""The inventory pipeline — catalogue the site, then download what is missing.

One pass:

1. **catalogue** — list every PDF via the WordPress media API and upsert each
   URL. New documents arrive as ``pending``; a document whose ``wp_modified``
   changed is re-queued. This is what makes the ledger an inventory of the whole
   corpus, not just of what has been downloaded.
2. **queue** — take the rows still needing work (``pending`` / ``failed``), in
   ``(wp_modified, url)`` order, bounded by ``--limit``.
3. **download** — for each queued URL, ``HEAD`` for a cheap change signal; skip
   it when the ledger already holds the same ``(last_modified, content_length)``
   and the bytes are on disk; otherwise stream it into the content-addressed
   store, hashing as we go.
4. record each outcome on the URL row.

Because the queue is just "unresolved rows", bounded runs keep advancing and a
failed download is simply still in the queue next run. Nothing parses PDFs —
the inventory ends when bytes are on disk with a ledger row.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime

from brh_core.config import Settings
from brh_core.inventory.discovery import MediaItem, WordPressMediaClient
from brh_core.inventory.ledger import InventoryLedger
from brh_core.inventory.store import ContentStore

DEFAULT_SCOPE = "brh.ht/media/pdf"
_EPOCH = datetime.min.replace(tzinfo=UTC)
UNKNOWN_YEAR = "unknown"


@dataclass(frozen=True, slots=True)
class InventoryReport:
    """Outcome of one inventory run."""

    run_id: str
    mode: str
    catalogued: int = 0  # PDFs the site listed this run
    new_urls: int = 0  # of those, how many were new to the ledger
    selected: int = 0  # download candidates taken from the queue
    downloaded: int = 0
    duplicated: int = 0
    unchanged: int = 0
    failed: int = 0
    bytes_written: int = 0
    failures: tuple[tuple[str, str], ...] = field(default_factory=tuple)
    by_year: dict[str, int] = field(default_factory=dict)
    """Publication years of the documents *selected* this run, oldest first."""

    @property
    def counts(self) -> dict[str, int]:
        return {
            "catalogued": self.catalogued,
            "new_urls": self.new_urls,
            "selected": self.selected,
            "downloaded": self.downloaded,
            "duplicated": self.duplicated,
            "unchanged": self.unchanged,
            "failed": self.failed,
            "bytes_written": self.bytes_written,
        }


def item_key(item: MediaItem) -> tuple[datetime, str]:
    """Total order over documents: ``(modified, url)``."""
    return (item.modified_gmt or _EPOCH, item.source_url)


def stratified_sample(candidates: Iterable[tuple[str, int | None]], limit: int) -> list[str]:
    """Pick ``limit`` documents spread across publication years.

    Round-robin by year — the first document of every year, then the second, and
    so on — so a bounded run covers the whole publication history instead of the
    head of the queue, which is what a plain ``--limit`` gives and why the first
    28 documents we downloaded were all 2018 circulars.

    Deterministic: the input order decides which document represents its year,
    and documents with no date form one group at the end.
    """
    buckets: dict[int | None, list[str]] = {}
    for url, year in candidates:
        buckets.setdefault(year, []).append(url)

    years = sorted(buckets, key=lambda year: (year is None, year or 0))
    picked: list[str] = []
    depth = 0
    while len(picked) < limit:
        added = False
        for year in years:
            if depth < len(buckets[year]):
                picked.append(buckets[year][depth])
                added = True
                if len(picked) == limit:
                    break
        if not added:
            break
        depth += 1
    return picked


def year_distribution(
    candidates: Iterable[tuple[str, int | None]], selected: Iterable[str]
) -> dict[str, int]:
    """How the selection spreads across years, oldest first."""
    years = {url: year for url, year in candidates}
    counts = Counter(UNKNOWN_YEAR if years[url] is None else str(years[url]) for url in selected)
    return dict(sorted(counts.items()))


def run_inventory(
    settings: Settings,
    *,
    ledger: InventoryLedger,
    client: WordPressMediaClient | None = None,
    store: ContentStore | None = None,
    since: datetime | None = None,
    limit: int | None = None,
    sample: int | None = None,
    force: bool = False,
    dry_run: bool = False,
    scope: str = DEFAULT_SCOPE,
) -> InventoryReport:
    """Run one inventory pass; contain per-URL errors and keep going."""
    client = client or WordPressMediaClient.from_settings(settings)
    store = store or ContentStore(settings.web_store_dir)

    items = sorted(client.iter_pdfs(), key=item_key)
    catalogued = len(items)

    mode = "bulk" if ledger.url_count() == 0 else "incremental"
    run_id = "dry-run" if dry_run else ledger.start_run(scope=scope, mode=mode, watermark=since)

    new_urls = 0
    by_year: dict[str, int] = {}
    if dry_run:
        resolved = ledger.resolved_urls()
        listed = [
            item.source_url for item in items if item.source_url and item.source_url not in resolved
        ]
    else:
        new_urls = ledger.catalogue(items, run_id)
        listed = []

    if sample is not None:
        # A stratified sample ignores the queue's order on purpose: it is the
        # whole point of asking for one.
        candidates = ledger.sample_candidates(since=since)
        selected_urls = stratified_sample(candidates, sample)
        by_year = year_distribution(candidates, selected_urls)
    elif dry_run:
        selected_urls = listed[:limit] if limit is not None else listed
    else:
        selected_urls = ledger.queue(limit=limit, since=since, include_resolved=force)

    downloaded = duplicated = unchanged = failed = bytes_written = 0
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
        for url in selected_urls:
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
        catalogued=catalogued,
        new_urls=new_urls,
        selected=len(selected_urls),
        downloaded=downloaded,
        duplicated=duplicated,
        unchanged=unchanged,
        failed=failed,
        bytes_written=bytes_written,
        failures=tuple(failures),
        by_year=by_year,
    )

    if not dry_run:
        ledger.finish_run(run_id, status="succeeded", counts=report.counts)

    return report
