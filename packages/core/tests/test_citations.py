"""Offline tests for citation deep links and snippets."""

from __future__ import annotations

from brh_core.citations import citation_from_chunk, make_snippet, pdf_url
from brh_core.models import RetrievedChunk


def test_pdf_url_joins_without_double_slash() -> None:
    assert (
        pdf_url("https://www.brh.ht/api/pdfs/", "rddcf-vol-3", 7)
        == "https://www.brh.ht/api/pdfs/rddcf-vol-3.pdf#page=7"
    )


def test_make_snippet_collapses_whitespace() -> None:
    assert make_snippet("  un\n\ntexte   utile  ") == "un texte utile"


def test_make_snippet_truncates_to_budget() -> None:
    snippet = make_snippet("a" * 400, max_chars=40)

    assert len(snippet) == 40
    assert snippet.endswith("…")


def test_citation_from_chunk_keeps_page_and_pdf_link() -> None:
    chunk = RetrievedChunk(
        chunk_id="chunk-1",
        document_id="doc-1",
        page_number=3,
        text="Le taux d’inflation annuel s’est établi à 28,3 %.",
        score=0.91,
    )

    citation = citation_from_chunk(
        chunk,
        slug="note-inflation-nov-2025",
        title="Note mensuelle d’inflation — novembre 2025",
        base_url="https://www.brh.ht/api/pdfs",
        source_url="https://www.brh.ht/wp-content/uploads/note.pdf",
    )

    assert citation.page_number == 3
    assert citation.pdf_url.endswith("note-inflation-nov-2025.pdf#page=3")
    assert citation.source_url == "https://www.brh.ht/wp-content/uploads/note.pdf"
    assert citation.snippet.startswith("Le taux d’inflation")
    assert citation.score == 0.91
