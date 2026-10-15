"""Offline tests for the BRH web inventory.

No Postgres and no network: the WordPress API and file URLs are faked with an
``httpx.MockTransport``, the ledger is an in-memory stand-in, and the raw store
writes to ``tmp_path``. This exercises the real pipeline logic — pagination,
incremental forwarding, content addressing, and the "never download twice"
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
PDF_A = b"%PDF-1.4 alpha\n" + b"a" * 256
PDF_B = b"%PDF-1.4 bravo\n" + b"b" * 512

# page -> media items; two pages so pagination is exercised.
MEDIA_PAGES = {
    1: [
        {
            "id": 1,
            "slug": "alpha",
            "title": {"rendered": "Alpha"},
            "source_url": f"{BASE}/wp-content/uploads/alpha.pdf",
            "mime_type": "application/pdf",
            "date_gmt": "2026-10-01T08:00:00",
            "modified_gmt": "2026-10-14T12:00:00",
        },
        {
            "id": 2,
            "slug": "bravo",
            "title": {"rendered": "Bravo"},
            "source_url": f"{BASE}/wp-content/uploads/bravo.pdf",
            "mime_type": "application/pdf",
            "date_gmt": "2026-10-02T08:00:00",
            "modified_gmt": "2026-10-14T12:01:00",
        },
    ],
    2: [
        {
            "id": 3,
            "slug": "alpha-copy",
            "title": {"rendered": "Alpha (copy)"},
            "source_url": f"{BASE}/wp-content/uploads/alpha-copy.pdf",
            "mime_type": "application/pdf",
            "date_gmt": "2026-10-03T08:00:00",
            "modified_gmt": "2026-10-14T12:02:00",
        },
    ],
}

# alpha-copy serves the *same bytes* as alpha: one artefact, two URLs.
FILES = {
    "/wp-content/uploads/alpha.pdf": PDF_A,
    "/wp-content/uploads/bravo.pdf": PDF_B,
    "/wp-content/uploads/alpha-copy.pdf": PDF_A,
}


class FakeLedger:
    """In-memory stand-in for :class:`InventoryLedger` (same method surface)."""

    def __init__(self) -> None:
        self.runs: dict[str, dict[str, object]] = {}
        self.urls: dict[str, dict[str, object]] = {}
        self.finished: list[tuple[str, str, dict[str, int]]] = []

    def start_run(self, *, scope: str, mode: str, watermark=None) -> str:
        run_id = f"run-{len(self.runs) + 1}"
        self.runs[run_id] = {"scope": scope, "mode": mode, "watermark": watermark}
        return run_id

    def finish_run(self, run_id: str, *, status: str, counts, error=None) -> None:
        self.finished.append((run_id, status, dict(counts)))

    def watermark(self):
        return None

    def upsert_seen(self, item, run_id: str) -> None:
        state = self.urls.setdefault(
            item.source_url,
            {"sha256": None, "raw_path": None, "last_modified": None, "content_length": None},
        )
        state.update(wp_id=item.wp_id, slug=item.slug)

    def get_url(self, url: str) -> UrlState | None:
        state = self.urls.get(url)
        if state is None:
            return None
        return UrlState(
            url=url,
            status=str(state.get("status", "pending")),
            sha256=state["sha256"],  # type: ignore[arg-type]
            raw_path=state["raw_path"],  # type: ignore[arg-type]
            last_modified=state["last_modified"],  # type: ignore[arg-type]
            content_length=state["content_length"],  # type: ignore[arg-type]
        )

    def mark_unchanged(self, url: str, run_id: str, *, http_status) -> None:
        self.urls[url]["status"] = "unchanged"

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
        self.urls[url].update(
            status="downloaded",
            sha256=sha256,
            raw_path=raw_path,
            last_modified=last_modified,
            content_length=content_length,
        )

    def mark_failed(self, url, run_id, *, error, http_status=None, status="failed") -> None:
        self.urls.setdefault(url, {})["status"] = status


def _transport(requests: list[httpx.Request]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        path = request.url.path
        if path == "/wp-json/wp/v2/media":
            page = int(request.url.params.get("page", "1"))
            return httpx.Response(
                200,
                json=MEDIA_PAGES.get(page, []),
                headers={"x-wp-totalpages": "2", "content-type": "application/json"},
            )
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


def _client(requests: list[httpx.Request]) -> WordPressMediaClient:
    return WordPressMediaClient(
        base_url=BASE, user_agent="test", delay=0.0, transport=_transport(requests)
    )


def _settings(tmp_path) -> Settings:
    return Settings(_env_file=None, raw_dir=tmp_path)


def test_iter_pdfs_paginates_parses_and_forwards_incremental(tmp_path):
    requests: list[httpx.Request] = []
    client = _client(requests)

    items = list(client.iter_pdfs(modified_after=datetime(2026, 10, 1, tzinfo=UTC)))

    assert [item.slug for item in items] == ["alpha", "bravo", "alpha-copy"]
    assert items[0].wp_id == 1
    assert items[0].title == "Alpha"
    assert items[0].modified_gmt == datetime(2026, 10, 14, 12, 0, tzinfo=UTC)

    media_calls = [r for r in requests if r.url.path == "/wp-json/wp/v2/media"]
    assert len(media_calls) == 2  # two pages
    assert all(
        r.url.params.get("modified_after") == "2026-10-01T00:00:00" for r in media_calls
    )
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


def test_run_inventory_downloads_then_skips(tmp_path):
    requests: list[httpx.Request] = []
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    first = run_inventory(settings, ledger=ledger, client=_client(requests), store=store)

    assert first.discovered == 3
    assert first.downloaded == 2  # alpha, bravo
    assert first.duplicated == 1  # alpha-copy shares alpha's bytes
    assert first.unchanged == 0
    assert first.failed == 0
    assert first.bytes_written == len(PDF_A) + len(PDF_B)
    assert len(list((tmp_path / "web").glob("*.pdf"))) == 2

    second = run_inventory(settings, ledger=ledger, client=_client(requests), store=store)

    assert second.discovered == 3
    assert second.downloaded == 0
    assert second.duplicated == 0
    assert second.unchanged == 3
    assert second.bytes_written == 0
    assert len(list((tmp_path / "web").glob("*.pdf"))) == 2  # nothing rewritten


def test_dry_run_writes_nothing(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    report = run_inventory(
        settings, ledger=ledger, client=_client([]), store=store, dry_run=True
    )

    assert report.discovered == 3
    assert report.downloaded == 3  # planned, not performed
    assert ledger.runs == {}
    assert not (tmp_path / "web").exists()


def test_failed_url_is_recorded_and_does_not_stop_the_run(tmp_path):
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/wp-json/wp/v2/media":
            page = int(request.url.params.get("page", "1"))
            return httpx.Response(
                200,
                json=MEDIA_PAGES.get(page, []),
                headers={"x-wp-totalpages": "2", "content-type": "application/json"},
            )
        if request.url.path.endswith("bravo.pdf"):
            return httpx.Response(500)
        data = FILES[request.url.path]
        if request.method == "HEAD":
            return httpx.Response(
                200,
                headers={
                    "content-length": str(len(data)),
                    "last-modified": "Wed, 14 Oct 2026 12:00:00 GMT",
                },
            )
        return httpx.Response(200, content=data)

    settings = _settings(tmp_path)
    ledger = FakeLedger()
    client = WordPressMediaClient(
        base_url=BASE, user_agent="test", delay=0.0, max_retries=1,
        transport=httpx.MockTransport(handler),
    )

    report = run_inventory(
        settings, ledger=ledger, client=client, store=ContentStore(tmp_path / "web")
    )

    assert report.discovered == 3
    assert report.failed == 1
    assert report.downloaded == 1  # alpha only
    assert report.duplicated == 1  # alpha-copy shares alpha's bytes
    assert any("bravo" in url for url, _ in report.failures)
