"""Fetching a document by URL: the rules a runner depends on.

Everything here runs offline against a fake opener — the point is identity and
failure behaviour, not the network.
"""

from __future__ import annotations

import hashlib
from io import BytesIO
from pathlib import Path
from urllib.error import HTTPError

import pytest
from brh_core.ingestion.fetch import NotAPdf, fetch_pdf

PDF = b"%PDF-1.7\n" + b"body bytes" * 40


class FakeResponse(BytesIO):
    def __enter__(self) -> FakeResponse:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


def opener_for(payload: bytes):
    def opener(request, timeout: int = 0):
        return FakeResponse(payload)

    return opener


def test_fetch_returns_the_content_hash_and_a_content_addressed_path(tmp_path: Path) -> None:
    digest, path = fetch_pdf("https://example.test/a.pdf", tmp_path, opener=opener_for(PDF))

    assert digest == hashlib.sha256(PDF).hexdigest()
    assert path == tmp_path / f"{digest}.pdf"
    assert path.read_bytes() == PDF


def test_the_same_bytes_are_not_rewritten(tmp_path: Path) -> None:
    first, path = fetch_pdf("https://example.test/a.pdf", tmp_path, opener=opener_for(PDF))
    stamp = path.stat().st_mtime_ns

    second, again = fetch_pdf("https://example.test/b.pdf", tmp_path, opener=opener_for(PDF))

    assert (first, path) == (second, again)
    assert again.stat().st_mtime_ns == stamp  # no second write


def test_different_bytes_get_different_identities(tmp_path: Path) -> None:
    other = PDF + b"appendix"
    one, _ = fetch_pdf("https://example.test/a.pdf", tmp_path, opener=opener_for(PDF))
    two, _ = fetch_pdf("https://example.test/a.pdf", tmp_path, opener=opener_for(other))

    assert one != two
    assert len(list(tmp_path.glob("*.pdf"))) == 2


def test_an_html_body_is_rejected_not_stored(tmp_path: Path) -> None:
    """brh.ht answers a dead link with an HTML page and HTTP 200."""
    html = b"<!DOCTYPE html><html><body>404</body></html>"

    with pytest.raises(NotAPdf, match="did not return a PDF"):
        fetch_pdf("https://example.test/gone.pdf", tmp_path, opener=opener_for(html))

    assert list(tmp_path.iterdir()) == []


def test_transport_errors_propagate(tmp_path: Path) -> None:
    def failing(request, timeout: int = 0):
        raise HTTPError("https://example.test/x.pdf", 503, "unavailable", {}, None)

    with pytest.raises(HTTPError):
        fetch_pdf("https://example.test/x.pdf", tmp_path, opener=failing)

    assert list(tmp_path.iterdir()) == []
