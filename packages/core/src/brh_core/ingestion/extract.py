"""Page-aware extraction from canonical PaddleOCR output with PDF fallback.

The contract that makes citations work: page numbers are **1-based** and match
the PDF viewer's ``#page=N`` fragment.

"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pymupdf

from brh_core.ingestion.markdown import PAGE_MARKER_RE


@dataclass(frozen=True, slots=True)
class ExtractedPage:
    page_number: int
    text: str


class InvalidOcrArtifact(ValueError):
    """The canonical OCR document does not match its source PDF."""


def extract_pages(pdf_path: Path, *, ocr_markdown: Path | None = None) -> list[ExtractedPage]:
    """Extract the text of every page, in order, 1-based.

    Use ``page.get_text("text")``.
    """
    if ocr_markdown is not None and ocr_markdown.is_file():
        ocr_pages = _read_marked_pages(ocr_markdown)
        expected = list(range(1, page_count(pdf_path) + 1))
        if list(ocr_pages) != expected:
            raise InvalidOcrArtifact(
                f"{ocr_markdown}: expected page markers 1..{len(expected)}, got {list(ocr_pages)}"
            )
        return [ExtractedPage(number, ocr_pages[number]) for number in expected]

    with pymupdf.open(pdf_path) as document:
        return [
            ExtractedPage(index + 1, page.get_text("text")) for index, page in enumerate(document)
        ]


def page_count(pdf_path: Path) -> int:
    """Number of pages in the PDF."""
    with pymupdf.open(pdf_path) as document:
        return len(document)


def _read_marked_pages(path: Path) -> dict[int, str]:
    markdown = path.read_text(encoding="utf-8")
    matches = list(PAGE_MARKER_RE.finditer(markdown))
    numbers = [int(match.group(1)) for match in matches]
    if numbers != list(range(1, len(numbers) + 1)):
        raise InvalidOcrArtifact(f"{path}: page markers must be unique and in order")
    pages: dict[int, str] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        pages[int(match.group(1))] = markdown[match.end() : end].strip()
    return pages
