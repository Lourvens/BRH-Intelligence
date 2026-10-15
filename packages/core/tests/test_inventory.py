"""Offline tests for the BRH web inventory.

No Postgres and no network: the WordPress API and file URLs are faked with an
``httpx.MockTransport``, the ledger is an in-memory stand-in, and the raw store
writes to ``tmp_path``. This exercises the real pipeline logic — pagination,
content addressing, the resume cursor, and the "never download twice" guarantee.
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
PDF_A = b"%PDF-1.4 alpha\n" + b"a" * 256
PDF_B = b"%PDF-1.4 bravo\n" + b"b" * 512
PDF_C = b"%PDF-1.4 charlie\n" + b"c" * 128
PDF_D = b"%PDF-1.4 delta\n" + b"d" * 1024

UPLOADS = f"{BASE}/wp-content/uploads"
UPLOAD_PATH = "/wp-content/uploads"


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
        self.urls: dict[str, dict[str, object]] = {}
        self.finished: list[tuple[str, str, dict[str, int]]] = []
        self.cursors: dict[str, tuple[datetime, str]] = {}

    def start_run(self, *, scope: str, mode: str, watermark=None) -> str:
        run_id = f"run-{len(self.runs) + 1}"
        self.runs[run_id] = {"scope": scope, "mode": mode, "watermark": watermark}
        return run_id

    def finish_run(self, run_id: str, *, status: str, counts, error=None) -> None:
        self.finished.append((run_id, status, dict(counts)))

    def get_cursor(self, scope: str) -> tuple[datetime, str] | None:
        return self.cursors.get(scope)

    def set_cursor(self, scope: str, modified: datetime, url: str) -> None:
        self.cursors[scope] = (modified, url)

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


def _transport(
    requests: list[httpx.Request], *, fail_paths: set[str] | None = None
) -> httpx.MockTransport:
    fail_paths = fail_paths if fail_paths is not None else set()

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


def _client(requests: list[httpx.Request], **kwargs) -> WordPressMediaClient:
    transport = _transport(requests, fail_paths=kwargs.pop("fail_paths", None))
    return WordPressMediaClient(
        base_url=BASE, user_agent="test", delay=0.0, transport=transport, **kwargs
    )


def _settings(tmp_path) -> Settings:
    return Settings(_env_file=None, raw_dir=tmp_path)


def test_iter_pdfs_paginates_parses_and_forwards_incremental():
    requests: list[httpx.Request] = []
    client = _client(requests)

    items = list(client.iter_pdfs(modified_after=datetime(2026, 10, 1, tzinfo=UTC)))

    assert [item.slug for item in items] == ["alpha", "bravo", "charlie", "delta", "alpha-copy"]
    assert items[0].wp_id == 1
    assert items[0].title == "Alpha"
    assert items[0].modified_gmt == datetime(2026, 10, 14, 12, 0, tzinfo=UTC)

    media_calls = [r for r in requests if r.url.path == "/wp-json/wp/v2/media"]
    assert len(media_calls) == 2  # two pages
    assert all(r.url.params.get("modified_after") == "2026-10-01T00:00:00" for r in media_calls)
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


def test_full_run_then_second_run_resumes_past_everything(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    first = run_inventory(settings, ledger=ledger, client=_client([]), store=store)

    assert first.discovered == 5
    assert first.downloaded == 4  # alpha, bravo, charlie, delta
    assert first.duplicated == 1  # alpha-copy shares alpha's bytes
    assert first.bytes_written == len(PDF_A) + len(PDF_B) + len(PDF_C) + len(PDF_D)
    assert len(list((tmp_path / "web").glob("*.pdf"))) == 4
    assert ledger.cursors[SCOPE][1].endswith("alpha-copy.pdf")

    second = run_inventory(settings, ledger=ledger, client=_client([]), store=store)

    assert second.discovered == 0  # cursor is past everything
    assert second.downloaded == 0
    assert len(list((tmp_path / "web").glob("*.pdf"))) == 4  # nothing rewritten


def test_bounded_runs_keep_advancing(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    def run() -> object:
        return run_inventory(
            settings, ledger=ledger, client=_client([]), store=store, limit=2
        )

    first, second, third, fourth = run(), run(), run(), run()

    assert (first.discovered, first.downloaded) == (2, 2)  # alpha, bravo
    assert (second.discovered, second.downloaded) == (2, 2)  # charlie, delta
    assert (third.discovered, third.duplicated) == (1, 1)  # alpha-copy (dedup)
    assert fourth.discovered == 0  # nothing left

    # the cursor marched forward through the ordering
    assert ledger.cursors[SCOPE][1].endswith("alpha-copy.pdf")
    assert len(list((tmp_path / "web").glob("*.pdf"))) == 4


def test_since_window_rerun_skips_unchanged(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()
    since = datetime(2026, 10, 1, tzinfo=UTC)

    first = run_inventory(settings, ledger=ledger, client=_client([]), store=store, since=since)
    assert first.downloaded == 4

    # `--since` bypasses the cursor, so this re-scans the window and must skip
    # every document via its (last_modified, content_length) signal.
    second = run_inventory(settings, ledger=ledger, client=_client([]), store=store, since=since)
    assert second.discovered == 5
    assert second.downloaded == 0
    assert second.unchanged == 5


def test_failure_does_not_block_others_and_is_retried(tmp_path):
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

    # bravo fails; the rest still complete, but the cursor stops *before* bravo.
    assert first.failed == 1
    assert first.downloaded == 3  # alpha, charlie, delta
    assert first.duplicated == 1  # alpha-copy
    assert ledger.cursors[SCOPE][1].endswith("alpha.pdf")

    # next run resumes at bravo, which now succeeds; the rest are unchanged.
    fail_paths.clear()
    second = run_inventory(
        settings,
        ledger=ledger,
        client=_client([], fail_paths=fail_paths, max_retries=0),
        store=store,
    )
    assert second.discovered == 4  # bravo, charlie, delta, alpha-copy
    assert second.downloaded == 1  # bravo retried successfully
    assert second.unchanged == 3
    assert ledger.cursors[SCOPE][1].endswith("alpha-copy.pdf")


def test_dry_run_writes_nothing(tmp_path):
    settings = _settings(tmp_path)
    store = ContentStore(tmp_path / "web")
    ledger = FakeLedger()

    report = run_inventory(
        settings, ledger=ledger, client=_client([]), store=store, dry_run=True
    )

    assert report.discovered == 5
    assert report.downloaded == 5  # planned, not performed
    assert ledger.runs == {}
    assert ledger.cursors == {}
    assert not (tmp_path / "web").exists()
