"""Page-aware text extraction with PyMuPDF (ADR-0005).

The contract that makes citations work: page numbers are **1-based** and match
the PDF viewer's ``#page=N`` fragment.

TODO: implement with ``import pymupdf`` (the ``fitz`` alias is deprecated).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class ExtractedPage:
    page_number: int
    text: str


def extract_pages(pdf_path: Path) -> list[ExtractedPage]:
    """Extract the text of every page, in order, 1-based.

    Use ``page.get_text("text")``.
    """
    raise NotImplementedError("TODO: PyMuPDF per-page extraction")


def page_count(pdf_path: Path) -> int:
    """Number of pages in the PDF."""
    raise NotImplementedError("TODO: PyMuPDF page count")
