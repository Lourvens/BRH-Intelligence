"""Citation helpers.

A citation must be able to open the exact source page (ADR-0005). We build a
deep link by appending ``#page=N`` to the public URL of the PDF; the browser's
built-in viewer honours that fragment.
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
    return f"{base_url.rstrip('/')}/{slug}.pdf#page={page_number}"


def make_snippet(text: str, *, max_chars: int = SNIPPET_MAX_CHARS) -> str:
    """Collapse whitespace and truncate to a readable snippet."""
    collapsed = " ".join(text.split())
    if len(collapsed) <= max_chars:
        return collapsed
    return f"{collapsed[: max_chars - 1].rstrip()}…"


def citation_from_chunk(
    chunk: RetrievedChunk,
    *,
    slug: str,
    title: str,
    base_url: str,
    source_url: str | None = None,
) -> Citation:
    """Assemble a :class:`Citation` from a hit plus its document metadata."""
    return Citation(
        document_id=chunk.document_id,
        slug=slug,
        title=title,
        page_number=chunk.page_number,
        snippet=make_snippet(chunk.text),
        score=chunk.score,
        pdf_url=pdf_url(base_url, slug, chunk.page_number),
        source_url=source_url,
    )
