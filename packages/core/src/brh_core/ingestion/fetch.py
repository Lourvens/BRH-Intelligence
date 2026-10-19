"""Fetch a PDF by URL into a content-addressed directory.

The catalogue knows URLs, not hashes: a document's identity only exists once its
bytes do. So runners download, hash, and then decide whether that exact content
has already been extracted — which is why this lives next to the batch runner
rather than in the crawler.

Two things are checked rather than assumed:

* the payload must start with ``%PDF``. brh.ht answers a dead link with an HTML
  page and HTTP 200, and storing that as a document would produce a "PDF" whose
  every page fails to render;
* a second fetch of the same bytes does not rewrite the file, so a retry is
  cheap and a half-written neighbour is never left behind.
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
from urllib.request import Request, urlopen

USER_AGENT = "Mozilla/5.0 (compatible; brh-intelligence/0.1)"
PDF_MAGIC = b"%PDF"


class NotAPdf(ValueError):
    """The URL answered with something that is not a PDF."""


def fetch_pdf(url: str, directory: Path, *, opener=urlopen, timeout: int = 180) -> tuple[str, Path]:
    """Download ``url`` into ``directory`` as ``<sha256>.pdf``.

    Returns ``(sha256, path)``. Raises :class:`NotAPdf` for a non-PDF body and
    lets transport errors propagate: a missing document is the caller's decision
    to record, not something to paper over here.
    """
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with opener(request, timeout=timeout) as response:
        payload = response.read()

    if not payload.startswith(PDF_MAGIC):
        raise NotAPdf(f"{url} did not return a PDF (starts with {payload[:8]!r})")

    digest = hashlib.sha256(payload).hexdigest()
    path = directory / f"{digest}.pdf"
    if path.is_file() and path.stat().st_size == len(payload):
        return digest, path  # same bytes, already here

    directory.mkdir(parents=True, exist_ok=True)
    staging = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    staging.write_bytes(payload)
    staging.replace(path)
    return digest, path
