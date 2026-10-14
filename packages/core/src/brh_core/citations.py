"""Citation helpers.

A citation must be able to open the exact source page (ADR-0005). We build a
deep link by appending ``#page=N`` to the public URL of the PDF; the browser's
built-in viewer honours that fragment.

TODO: implement. Everything here is contract-first — keep the signatures.
"""

from __future__ import annotations

from brh_core.models import Citation, RetrievedChunk

SNIPPET_MAX_CHARS = 320


def pdf_url(base_url: str, slug: str, page_number: int) -> str:
    """Deep link to ``page_number`` of the PDF identified by ``slug``.

    Example: ``http://host/api/pdfs`` + ``rddcf-vol-3`` + ``7`` should yield
    ``http://host/api/pdfs/rddcf-vol-3.pdf#page=7`` (trailing slash on the
    base must not produce a double slash).
    """
    raise NotImplementedError("TODO: build the PDF page deep link")


def make_snippet(text: str, *, max_chars: int = SNIPPET_MAX_CHARS) -> str:
    """Collapse whitespace and truncate to a readable snippet."""
    raise NotImplementedError("TODO: collapse whitespace + truncate")


def citation_from_chunk(
    chunk: RetrievedChunk,
    *,
    slug: str,
    title: str,
    base_url: str,
    source_url: str | None = None,
) -> Citation:
    """Assemble a :class:`Citation` from a hit plus its document metadata."""
    raise NotImplementedError("TODO: assemble a Citation from a hit")
