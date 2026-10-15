"""Offline tests for the BRH web inventory.

No Postgres and no network: the WordPress API and file URLs are faked with an
``httpx.MockTransport``, the ledger is an in-memory stand-in, and the raw store
writes to ``tmp_path``. This exercises the real pipeline logic — pagination,
catalogue-then-download, the unresolved queue, content addressing, re-queueing
of changed documents, retry of failures, and the "never download twice"
guarantee.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime

import httpx
from brh_core.config import Settings
from brh_core.inventory.discovery import WordPressMediaClient
from brh_core.inventory.ledger import UrlState
from brh_core.inventory.pipeline import run_inventory
from brh_core.inventory.store import ContentStore

BASE = "https://www.brh.ht"
SCOPE = "brh.ht/media/pdf"
UPLOADS = f"{BASE}/wp-content/uploads"
UPLOAD_PATH = "/wp-content/uploads"
PDF_A = b"%PDF-1.4 alpha\n" + b"a" * 256
PDF_B = b"%PDF-1.4 bravo\n" + b"b" * 512
PDF_C = b"%PDF-1.4 charlie\n" + b"c" * 128
PDF_D = b"%PDF-1.4 delta\n" + b"d" * 1024


def _item(wp_id: int, slug: str, modified: str) -> dict:
    return {
        "id": wp_id,
        "slug": slug,
        "title": {"rendered": slug.title()},
        "source_url": f"{UPLOADS}/{slug}.pdf",
        "mime_type": "application/pdf",
        "date_gmt": "2026-10-01T08:00:00",
        "modified_gmt": modified,
    }


# two pages, five documents, ascending modified; alpha-copy shares alpha's bytes.
MEDIA_PAGES = {
    1: [
        _item(1, "alpha", "2026-10-14T12:00:00"),
        _item(2, "bravo", "2026-10-14T12:01:00"),
        _item(3, "charlie", "2026-10-14T12:02:00"),
    ],
    2: [
        _item(4, "delta", "2026-10-14T12:03:00"),
        _item(5, "alpha-copy", "2026-10-14T12:04:00"),
    ],
}

FILES = {
    f"{UPLOAD_PATH}/alpha.pdf": PDF_A,
    f"{UPLOAD_PATH}/bravo.pdf": PDF_B,
    f"{UPLOAD_PATH}/charlie.pdf": PDF_C,
    f"{UPLOAD_PATH}/delta.pdf": PDF_D,
    f"{UPLOAD_PATH}/alpha-copy.pdf": PDF_A,
}


class FakeLedger:
    """In-memory stand-in for :class:`InventoryLedger` (same method surface)."""

    def __init__(self) -> None:
        self.runs: dict[str, dict[str, object]] = {}
        self.rows: dict[str, dict[str, object]] = {}
        self.finished: list[tuple[str, str, dict[str, int]]] = []

    def start_run(self, *, scope: str, mode: str, watermark=None) -> str:
        run_id = f"run-{len(self.runs) + 1}"
        self.runs[run_id] = {"scope": scope, "mode": mode, "watermark": watermark}
        return run_id

    def finish_run(self, run_id: str, *, status: str, counts, error=None) -> None:
        self.finished.append((run_id, status, dict(counts)))

    def url_count(self) -> int:
        return len(self.rows)

    def catalogue(self, items, run_id: str) -> int:
        new = 0
        for item in items:
            if not item.source_url:
                continue
            row = self.rows.get(item.source_url)
            if row is None:
                self.rows[item.source_url] = {
                    "status": "pending",
                    "sha256": None,
                    "raw_path": None,
                    "last_modified": None,
                    "content_length": None,
                    "wp_modified": item.modified_gmt,
                }
                new += 1
            else:
                if row["wp_modified"] != item.modified_gmt:
                    row["status"] = "pending"
                row["wp_modified"] = item.modified_gmt
        return new

    def queue(self, *, limit=None, since=None, include_resolved=False) -> list[str]:
        ordered = sorted(
            self.rows.items(),
            key=lambda kv: (kv[1]["wp_modified"] or datetime.min.replace(tzinfo=UTC), kv[0]),
        )
        urls = [
            url
            for url, row in ordered
            if (include_resolved or row["status"] in ("pending", "failed"))
            and (since is None or (row["wp_modified"] and row["wp_modified"] > since))
        ]
        return urls[:limit] if limit is not None else urls

    def resolved_urls(self) -> set[str]:
        return {
            url
            for url, row in self.rows.items()
            if row["status"] in ("downloaded", "unchanged", "gone")
        }

    def get_url(self, url: str) -> UrlState | None:
        row = self.rows.get(url)
        if row is None:
            return None
        return UrlState(
            url=url,
            status=str(row["status"]),
            sha256=row["sha256"],  # type: ignore[arg-type]
            raw_path=row["raw_path"],  # type: ignore[arg-type]
            last_modified=row["last_modified"],  # type: ignore[arg-type]
            content_length=row["content_length"],  # type: ignore[arg-type]
        )

    def mark_unchanged(self, url: str, run_id: str, *, http_status) -> None:
        self.rows[url]["status"] = "unchanged"

    def mark_downloaded(
        self,
        url: str,
        run_id: str,
        *,
        sha256: str,
        raw_path: str,
        http_status,
        content_length,
        last_modified,
    ) -> None:
        self.rows[url].update(
            status="downloaded",
            sha256=sha256,
            raw_path=raw_path,
            last_modified=last_modified,
            content_length=content_length,
        )

    def mark_failed(self, url, run_id, *, error, http_status=None, status="failed") -> None:
        self.rows.setdefault(url, {})["status"] = status


def _transport(
    requests: list[httpx.Request],
    *,
    media: dict[int, list[dict]],
    fail_paths: set[str],
) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        path = request.url.path
        if path == "/wp-json/wp/v2/media":
            page = int(request.url.params.get("page", "1"))
            return httpx.Response(
                200,
                json=media.get(page, []),
                headers={"x-wp-totalpages": "2", "content-type": "application/json"},
            )
        if path in fail_paths:
            return httpx.Response(500)
        data = FILES[path]
        if request.method == "HEAD":
            return httpx.Response(
                200,
                headers={
                    "content-length": str(len(data)),
                    "last-modified": "Wed, 14 Oct 2026 12:00:00 GMT",
                    "content-type": "application/pdf",
                },
            )
        return httpx.Response(200, content=data, headers={"content-type": "application/pdf"})

    return httpx.MockTransport(handler)


def _client(requests: list[httpx.Request], *, media=None, fail_paths=None, **kwargs):
    transport = _transport(
        requests, media=media or MEDIA_PAGES, fail_paths=fail_paths or set()
    )
    return WordPressMediaClient(
        base_url=BASE, user_agent="test", delay=0.0, transport=transport, **kwargs
    )


def _settings(tmp_path) -> Settings:
    return Settings(_env_file=None, raw_dir=tmp_path)


def _touched_alpha() -> dict[int, list[dict]]:
    """MEDIA_PAGES with alpha's wp_modified bumped (same bytes)."""
    return {
        1: [{**MEDIA_PAGES[1][0], "modified_gmt": "2026-10-20T00:00:00"}, *MEDIA_PAGES[1][1:]],
        2: MEDIA_PAGES[2],
    }


def test_iter_pdfs_paginates_and_parses():
    requests: list[httpx.Request] = []
    items = list(_client(requests).iter_pdfs())

    assert [item.slug for item in items] == ["alpha", "bravo", "charlie", "delta", "alpha-copy"]
    assert items[0].wp_id == 1
    assert items[0].title == "Alpha"
    assert items[0].modified_gmt == datetime(2026, 10, 14, 12, 0, tzinfo=UTC)

    media_calls = [r for r in requests if r.url.path == "/wp-json/wp/v2/media"]
    assert len(media_calls) == 2  # two pages
    assert all(r.url.params.get("mime_type") == "application/pdf" for r in media_calls)


def test_content_store_is_content_addressed(tmp_path):
    store = ContentStore(tmp_path)

    first = store.save([PDF_A])
    assert first.created is True
    assert first.sha256 == hashlib.sha256(PDF_A).hexdigest()
    assert first.path == tmp_path / f"{first.sha256}.pdf"

    second = store.save([PDF_A])
    assert second.created is False
    assert second.path == first.path

    assert len(list(tmp_path.glob("*.pdf"))) == 1
    assert not list(tmp_path.glob(".dl-*"))  # no temp files left behind


def test_catalogue_records_every_url_even_when_limit_bounds_download(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    report = run_inventory(settings, ledger=ledger, client=_client([]), store=store, limit=2)

    assert report.catalogued == 5
    assert report.new_urls == 5
    assert report.selected == 2
    assert report.downloaded == 2
    # all five URLs are in the ledger, three of them still pending
    assert len(ledger.rows) == 5
    assert sum(row["status"] == "pending" for row in ledger.rows.values()) == 3


def test_bounded_runs_keep_advancing(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    def run() -> object:
        return run_inventory(
            settings, ledger=ledger, client=_client([]), store=store, limit=2
        )

    first, second, third, fourth = run(), run(), run(), run()

    assert (first.selected, first.downloaded) == (2, 2)  # alpha, bravo
    assert (second.selected, second.downloaded) == (2, 2)  # charlie, delta
    assert (third.selected, third.duplicated) == (1, 1)  # alpha-copy (dedup)
    assert fourth.selected == 0  # queue drained
    assert len(list((tmp_path / "web").glob("*.pdf"))) == 4  # never rewritten
    assert all(r.catalogued == 5 for r in (first, second, third, fourth))


def test_changed_document_is_requeued_then_skipped_by_head(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    first = run_inventory(settings, ledger=ledger, client=_client([]), store=store)
    assert first.downloaded == 4 and first.duplicated == 1

    # alpha's wp_modified moves (a metadata touch) but its bytes are unchanged.
    second = run_inventory(
        settings, ledger=ledger, client=_client([], media=_touched_alpha()), store=store
    )
    assert second.new_urls == 0
    assert second.selected == 1  # only alpha was re-queued
    assert second.unchanged == 1  # HEAD signal says it is still current
    assert second.downloaded == 0


def test_failure_is_retried_on_the_next_run(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()
    fail_paths = {f"{UPLOAD_PATH}/bravo.pdf"}

    first = run_inventory(
        settings,
        ledger=ledger,
        client=_client([], fail_paths=fail_paths, max_retries=0),
        store=store,
    )
    assert first.selected == 5
    assert first.failed == 1  # bravo
    assert first.downloaded == 3
    assert first.duplicated == 1

    # the failure is still queued; a later run picks it up and succeeds.
    second = run_inventory(
        settings, ledger=ledger, client=_client([], fail_paths=set(), max_retries=0), store=store
    )
    assert second.selected == 1
    assert second.downloaded == 1
    assert second.new_urls == 0


def test_since_narrows_the_download_window(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    report = run_inventory(
        settings,
        ledger=ledger,
        client=_client([]),
        store=store,
        since=datetime(2026, 10, 14, 12, 1, 30, tzinfo=UTC),
    )

    assert report.catalogued == 5  # the whole catalogue is still recorded
    assert report.selected == 3  # charlie (12:02), delta (12:03), alpha-copy (12:04)
    assert report.downloaded == 3  # alpha is outside the window, so no dedup hit
    assert len(ledger.rows) == 5


def test_dry_run_writes_nothing(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    report = run_inventory(
        settings, ledger=ledger, client=_client([]), store=store, dry_run=True
    )

    assert report.catalogued == 5
    assert report.selected == 5
    assert report.downloaded == 5  # planned, not performed
    assert ledger.rows == {}
    assert ledger.runs == {}
    assert not (tmp_path / "web").exists()
