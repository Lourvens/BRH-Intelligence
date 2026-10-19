"""Normalise OCR markdown into something portable.

Engines differ in how they express structure. PaddleOCR-VL writes HTML tables
with a ``style`` attribute on every cell, wraps captions in ``<div style=…>``,
and points figures at ``imgs/…`` — a directory that only exists inside each
page's own folder, so the paths are dead once pages are merged.

This module removes the presentation and keeps the meaning. It is pure standard
library on purpose: the corpus needs it even when no OCR engine is installed.
"""

from __future__ import annotations

import html
import re
from html.parser import HTMLParser

#: Page boundary in an assembled document. Numbered, so a citation can say
#: "page 9" and mean the PDF viewer's ``#page=9`` (ADR-0005).
PAGE_MARKER = "<!-- page {number} -->"
PAGE_MARKER_RE = re.compile(r"^<!-- page (\d+) -->$", re.M)

DIV = re.compile(r"<div[^>]*>(.*?)</div>", re.S)
TABLE = re.compile(r"<table\b.*?</table>", re.S | re.I)
IMG = re.compile(r"<img\b[^>]*?src=[\"']([^\"']+)[\"'][^>]*>", re.I)


class _Table(HTMLParser):
    """Collect cells, and notice anything that blocks a pipe table."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None
        self.simple = True
        self._depth = 0

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag == "table":
            if self._depth:
                self.simple = False  # a table inside a table cannot be flattened
            self._depth += 1
        elif tag == "tr":
            self._row = []
        elif tag in ("td", "th"):
            if any(name in ("colspan", "rowspan") for name, _ in attrs):
                self.simple = False
            self._cell = []

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None
        elif tag == "table":
            self._depth -= 1

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)


def pipe_table(rows: list[list[str]]) -> str | None:
    """Render rows as a GFM pipe table, or ``None`` if the shape is irregular."""
    width = len(rows[0]) if rows else 0
    if width == 0 or any(len(row) != width for row in rows):
        return None

    def line(cells: list[str]) -> str:
        return "| " + " | ".join(cell or " " for cell in cells) + " |"

    header, *body = rows
    rule = "|" + "|".join([" --- "] * width) + "|"
    return "\n".join([line(header), rule, *map(line, body)])


def clean_table(markup: str) -> str:
    """A pipe table when the grid is regular, otherwise attribute-free HTML."""
    parser = _Table()
    try:
        parser.feed(markup)
    except Exception:  # a malformed table must not kill the document
        return markup
    if parser.simple:
        rendered = pipe_table(parser.rows)
        if rendered:
            return rendered
    # Ragged rows keep their HTML: padding them would shift values by a column.
    return re.sub(r"<(\w+)\b[^>]*>", lambda m: f"<{m.group(1)}>", markup)


def clean_page(markdown: str) -> str:
    """Strip presentation from one page of OCR markdown."""
    text = DIV.sub(lambda m: m.group(1).strip() + "\n", markdown)
    text = TABLE.sub(lambda m: clean_table(m.group(0)), text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_markdown(markdown: str) -> str:
    """Clean a document that already carries its own page markers."""
    matches = list(PAGE_MARKER_RE.finditer(markdown))
    if not matches:
        return clean_page(markdown) + "\n"
    out = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        body = clean_page(markdown[match.end() : end])
        out.append(PAGE_MARKER.format(number=match.group(1)) + "\n\n" + body)
    return "\n\n".join(out) + "\n"


def page_numbers(markdown: str) -> list[int]:
    """The page markers present, in order."""
    return [int(n) for n in PAGE_MARKER_RE.findall(markdown)]
