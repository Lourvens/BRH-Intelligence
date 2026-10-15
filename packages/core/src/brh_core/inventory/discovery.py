"""Discovery of BRH documents on the WordPress site.

`brh.ht` is a WordPress install whose REST API is public. Every uploaded PDF is
an *attachment* (media item), so ``GET /wp-json/wp/v2/media?mime_type=application/pdf``
enumerates the whole document universe as JSON — no HTML crawl, no sitemap.

Design choices, measured in ``experiments/notebooks/0002-brh-discovery.ipynb``:

* filter with ``mime_type=application/pdf`` (``media_type`` rejects ``pdf``);
* incremental discovery via ``modified_after`` (the scheduling primitive);
* files are plain ``application/pdf`` over Apache, so raw streaming is enough
  (no JS renderer / paid crawler);
* the server sends ``Last-Modified`` + ``Content-Length`` but **no ETag**, so a
  cheap pre-download check is possible but is only a hint — the content hash is
  the real identity.

This module is transport-only: it fetches and parses. It never writes to the
ledger or to disk.
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from contextlib import AbstractContextManager
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any

import httpx

from brh_core.config import Settings

RETRYABLE_STATUSES = frozenset({429, 500, 502, 503, 504})
DEFAULT_PER_PAGE = 100
MEDIA_FIELDS = "id,slug,title,source_url,mime_type,date_gmt,modified_gmt,media_details"


@dataclass(frozen=True, slots=True)
class MediaItem:
    """One WordPress media attachment (a PDF, given our filter)."""

    wp_id: int
    slug: str
    title: str
    source_url: str
    mime_type: str
    date_gmt: datetime | None
    modified_gmt: datetime | None
    filesize: int | None = None  # from media_details; known before download


@dataclass(frozen=True, slots=True)
class RemoteStat:
    """The cheap, pre-download change signal for a file URL."""

    status_code: int
    last_modified: datetime | None
    content_length: int | None


def _parse_gmt(value: str | None) -> datetime | None:
    """Parse a WordPress ``*_gmt`` timestamp (naive, always UTC)."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).replace(tzinfo=UTC)
    except ValueError:
        return None


def _parse_http_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None


def _to_media_item(raw: dict[str, Any]) -> MediaItem:
    title = raw.get("title")
    if isinstance(title, dict):
        title = title.get("rendered", "")
    details = raw.get("media_details")
    filesize = details.get("filesize") if isinstance(details, dict) else None
    return MediaItem(
        wp_id=int(raw["id"]),
        slug=str(raw.get("slug", "")),
        title=str(title or ""),
        source_url=str(raw.get("source_url", "")),
        mime_type=str(raw.get("mime_type", "")),
        date_gmt=_parse_gmt(raw.get("date_gmt")),
        modified_gmt=_parse_gmt(raw.get("modified_gmt")),
        filesize=int(filesize) if isinstance(filesize, (int, float)) else None,
    )


class WordPressMediaClient:
    """A polite, retrying client for the WordPress media API and file URLs."""

    def __init__(
        self,
        *,
        base_url: str,
        user_agent: str,
        timeout: float = 30.0,
        delay: float = 0.3,
        max_retries: int = 3,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._delay = delay
        self._max_retries = max_retries
        self._client = httpx.Client(
            headers={"User-Agent": user_agent},
            timeout=timeout,
            follow_redirects=True,
            transport=transport,
        )

    @classmethod
    def from_settings(cls, settings: Settings) -> WordPressMediaClient:
        return cls(
            base_url=settings.web_base_url,
            user_agent=settings.web_user_agent,
            timeout=settings.web_timeout,
            delay=settings.web_request_delay,
            max_retries=settings.web_max_retries,
        )

    def close(self) -> None:
        self._client.close()

    @property
    def _api(self) -> str:
        return f"{self._base_url}/wp-json/wp/v2"

    def iter_pdfs(
        self, *, modified_after: datetime | None = None, per_page: int = DEFAULT_PER_PAGE
    ) -> Iterator[MediaItem]:
        """Yield every PDF attachment, oldest-modified first.

        When ``modified_after`` is given, WordPress returns only attachments
        changed since that instant — the incremental primitive.
        """
        page = 1
        while True:
            params: dict[str, Any] = {
                "mime_type": "application/pdf",
                "per_page": per_page,
                "page": page,
                "orderby": "modified",
                "order": "asc",
                "_fields": MEDIA_FIELDS,
            }
            if modified_after is not None:
                params["modified_after"] = modified_after.astimezone(UTC).strftime(
                    "%Y-%m-%dT%H:%M:%S"
                )

            response = self._request("GET", f"{self._api}/media", params=params)
            if response.status_code == 400 and page > 1:
                # WordPress answers 400 (rest_post_invalid_page_number) past the
                # last page; treat that as the natural end of the collection.
                break
            response.raise_for_status()

            items = response.json()
            if not items:
                break
            for raw in items:
                yield _to_media_item(raw)

            total_pages = int(response.headers.get("x-wp-totalpages", "1") or 1)
            if page >= total_pages:
                break
            page += 1

    def stat(self, url: str) -> RemoteStat:
        """``HEAD`` a file URL for its change signal."""
        response = self._request("HEAD", url)
        return RemoteStat(
            status_code=response.status_code,
            last_modified=_parse_http_date(response.headers.get("last-modified")),
            content_length=_content_length(response),
        )

    def stream(self, url: str) -> AbstractContextManager[httpx.Response]:
        """Open a streaming GET; the caller consumes ``iter_bytes()``."""
        return self._client.stream("GET", url)

    def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        """Send a request with bounded backoff on transport errors and 429/5xx."""
        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            if attempt:
                time.sleep(self._delay * attempt)
            try:
                response = self._client.request(method, url, **kwargs)
            except httpx.TransportError as exc:
                last_error = exc
                continue
            if response.status_code in RETRYABLE_STATUSES:
                last_error = httpx.HTTPStatusError(
                    f"retryable HTTP {response.status_code}",
                    request=response.request,
                    response=response,
                )
                continue
            if self._delay:
                time.sleep(self._delay)
            return response
        assert last_error is not None
        raise last_error


def _content_length(response: httpx.Response) -> int | None:
    value = response.headers.get("content-length")
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None
