"""Markdown → typed blocks.

The chunking strategy never reads Markdown. It reads headings, paragraphs and
tables that already know their format, their header rows and their page span.
Parsing and policy are separate on purpose: only the policy is a judgement call.

Nothing here is clever about content. ``clean.py`` already refuses to flatten a
ragged table, and this module refuses too — a reflowed table moves values under
the wrong header.
"""

from __future__ import annotations

import html
from collections.abc import Sequence
from dataclasses import dataclass, replace
from enum import StrEnum

from brh_core.ingestion.chunking.patterns import (
    CELL,
    GFM_ROW,
    HEADING,
    HTML_TABLE_END,
    HTML_TABLE_START,
    PERIOD_CELL,
    ROW,
    SEPARATOR_CELL,
    TAG,
)
from brh_core.ingestion.extract import ExtractedPage
from brh_core.ingestion.markdown import PAGE_MARKER_RE


class BlockKind(StrEnum):
    heading = "heading"
    paragraph = "paragraph"
    table = "table"


@dataclass(frozen=True, slots=True)
class TableBlock:
    """A table as rows of cells, plus the markup needed to render it back."""

    format: str  # "gfm" | "html"
    raw: str
    rows: tuple[tuple[str, ...], ...]
    raw_rows: tuple[str, ...]
    header_rows: int
    ragged: bool
    page_start: int
    page_end: int
    continuation: bool = False

    @property
    def column_count(self) -> int:
        return len(self.rows[0]) if self.rows else 0

    @property
    def header(self) -> tuple[tuple[str, ...], ...]:
        return self.rows[: self.header_rows]

    @property
    def data_rows(self) -> tuple[tuple[str, ...], ...]:
        return self.rows[self.header_rows :]

    @property
    def header_markup(self) -> str:
        """Header rows, plus the GFM rule, so a repeated header renders as one."""
        if not self.header_rows:
            return ""
        header = list(self.raw_rows[: self.header_rows])
        if self.format == "gfm":
            header.append("| " + " | ".join("---" for _ in range(self.column_count)) + " |")
        return "\n".join(header)

    def render(self, indices: Sequence[int]) -> str:
        """Rows by index, in the original format — verbatim for HTML."""
        offset = self.header_rows
        return "\n".join(self.raw_rows[offset + index] for index in indices)

    def semantic_rows(self, indices: Sequence[int]) -> str:
        """Compact cell-labelled rows for HTML tables.

        OCR HTML often has meaningful values but no reliable ``<th>`` tags.
        Keep the original markup for citation fidelity and add a small
        embedding-friendly representation so values remain associated with
        their column labels.
        """
        if self.format != "html":
            return ""
        headers = _semantic_headers(self.header)
        rows: list[str] = []
        for index in indices:
            rows.append(self.semantic_row(self.data_rows[index], headers=headers))
        return "\n".join(rows)

    def semantic_row(
        self, cells: Sequence[str], *, headers: Sequence[str] | None = None
    ) -> str:
        """Return one labelled row, including a stable label for fragments."""
        labels = list(headers) if headers is not None else _semantic_headers(self.header)
        values = []
        for position, value in enumerate(cells):
            label = labels[position] if position < len(labels) else f"colonne {position + 1}"
            if value:
                values.append(f"{label}: {value}")
        return "Ligne — " + " ; ".join(values)


@dataclass(frozen=True, slots=True)
class Block:
    kind: BlockKind
    text: str
    page_start: int
    page_end: int
    level: int = 0
    table: TableBlock | None = None


def blocks_from_markdown(markdown: str) -> list[Block]:
    """Typed blocks of a ``document.md``, in reading order."""
    return blocks_from_pages(pages_in(markdown))


def pages_in(markdown: str) -> list[ExtractedPage]:
    """Split ``document.md`` on the runner's page markers.

    The marker format is owned by :mod:`brh_core.ingestion.markdown`; this only
    slices. Page numbers are 1-based and match the PDF viewer (ADR-0005).
    """
    matches = list(PAGE_MARKER_RE.finditer(markdown))
    pages: list[ExtractedPage] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        pages.append(ExtractedPage(int(match.group(1)), markdown[match.end() : end].strip()))
    return pages


def blocks_from_pages(pages: Sequence[ExtractedPage]) -> list[Block]:
    blocks: list[Block] = []
    for page in pages:
        blocks.extend(_blocks_of_page(page))
    return stitch_tables(blocks)


def _blocks_of_page(page: ExtractedPage) -> list[Block]:
    lines = page.text.splitlines()
    blocks: list[Block] = []
    paragraph: list[str] = []
    index = 0

    def flush() -> None:
        text = "\n".join(paragraph).strip()
        if text:
            blocks.append(Block(BlockKind.paragraph, text, page.page_number, page.page_number))
        paragraph.clear()

    while index < len(lines):
        line = lines[index]

        heading = HEADING.match(line)
        if heading:
            flush()
            blocks.append(
                Block(
                    BlockKind.heading,
                    heading.group(2).strip(),
                    page.page_number,
                    page.page_number,
                    level=len(heading.group(1)),
                )
            )
            index += 1
            continue

        start = HTML_TABLE_START.search(line)
        if start:
            before = line[: start.start()].strip()
            if before:
                paragraph.append(before)
            flush()
            markup, index = _collect_html_table(lines, index)
            blocks.append(_html_table(markup, page.page_number))
            continue

        if GFM_ROW.match(line):
            run: list[str] = []
            while index < len(lines) and GFM_ROW.match(lines[index]):
                run.append(lines[index])
                index += 1
            table = _gfm_table(run, page.page_number)
            if table is not None:
                flush()
                blocks.append(table)
            else:
                paragraph.extend(run)
            continue

        if not line.strip():
            flush()
        else:
            paragraph.append(line)
        index += 1

    flush()
    return blocks


def _collect_html_table(lines: Sequence[str], index: int) -> tuple[str, int]:
    collected: list[str] = []
    depth = 0
    while index < len(lines):
        line = lines[index]
        collected.append(line)
        depth += len(HTML_TABLE_START.findall(line))
        depth -= len(HTML_TABLE_END.findall(line))
        index += 1
        if depth <= 0 and HTML_TABLE_END.search(collected[-1]):
            break
    return "\n".join(collected), index


def _gfm_table(run: Sequence[str], page_number: int) -> Block | None:
    """A pipe run is a table; a separator makes its first row a header.

    A continuation cut by the page marker usually has no separator, so refusing
    it would turn half of a table into a paragraph.
    """
    rows = [_split_gfm_row(line) for line in run]
    if len(rows) < 2:
        return None
    if _is_separator(rows[1]):
        header_rows, data = 1, [rows[0], *rows[2:]]
    else:
        header_rows, data = 0, rows

    table = TableBlock(
        format="gfm",
        raw="\n".join(run),
        rows=tuple(tuple(row) for row in data),
        raw_rows=tuple("| " + " | ".join(cell or " " for cell in row) + " |" for row in data),
        header_rows=header_rows,
        ragged=len({len(row) for row in data}) > 1,
        page_start=page_number,
        page_end=page_number,
        continuation=header_rows == 0,
    )
    return Block(BlockKind.table, table.raw, page_number, page_number, table=table)


def _split_gfm_row(line: str) -> list[str]:
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    cells: list[str] = []
    current: list[str] = []
    escaped = False
    for char in stripped:
        if char == "|" and not escaped:
            cells.append("".join(current).strip())
            current = []
            continue
        escaped = char == "\\" and not escaped
        current.append(char)
    cells.append("".join(current).strip())
    return cells


def _is_separator(row: Sequence[str]) -> bool:
    return bool(row) and all(SEPARATOR_CELL.match(cell.strip() or "--") for cell in row)


def _html_table(markup: str, page_number: int) -> Block:
    rows: list[tuple[str, ...]] = []
    raw_rows: list[str] = []
    header_rows = 0
    saw_th = False
    leading = True

    for match in ROW.finditer(markup):
        cells = CELL.findall(match.group(1))
        header = bool(cells) and all(tag.lower() == "h" for tag, _ in cells)
        rows.append(tuple(html.unescape(TAG.sub("", value).strip()) for _, value in cells))
        raw_rows.append(match.group(0).strip())
        if leading and (header or _looks_html_header(rows[-1])):
            saw_th = True
            header_rows += 1
        else:
            leading = False

    if not saw_th and rows and _looks_transposed(rows[0]):
        header_rows = 1
        while header_rows < min(len(rows) - 1, 3) and _looks_transposed(rows[header_rows]):
            header_rows += 1

    table = TableBlock(
        format="html",
        raw=markup,
        rows=tuple(rows),
        raw_rows=tuple(raw_rows),
        header_rows=min(header_rows, max(len(rows) - 1, 0)),
        ragged=len({len(row) for row in rows}) > 1,
        page_start=page_number,
        page_end=page_number,
        continuation=HTML_TABLE_END.search(markup) is None,
    )
    return Block(BlockKind.table, table.raw, page_number, page_number, table=table)


def _looks_transposed(row: Sequence[str]) -> bool:
    """A header row of periods (``'' | 4e trimestre 2009 | …``) is a header."""
    cells = [cell for cell in row[1:] if cell]
    if len(cells) < 2:
        return False
    return sum(bool(PERIOD_CELL.match(cell)) for cell in cells) / len(cells) >= 0.5


def _looks_html_header(row: Sequence[str]) -> bool:
    """Recognise OCR headers emitted as ``td`` cells instead of ``th``."""
    cells = [cell for cell in row[1:] if cell]
    if len(cells) < 2:
        return False
    return sum(bool(PERIOD_CELL.match(cell)) for cell in cells) / len(cells) >= 0.5


def _semantic_headers(headers: Sequence[Sequence[str]]) -> list[str]:
    if not headers:
        return []
    width = max((len(row) for row in headers), default=0)
    labels: list[str] = []
    for position in range(width):
        parts = [
            row[position].strip()
            for row in headers
            if position < len(row) and row[position].strip()
        ]
        labels.append(" / ".join(dict.fromkeys(parts)) or f"colonne {position + 1}")
    return labels


def stitch_tables(blocks: Sequence[Block]) -> list[Block]:
    """Rejoin a table that the page marker cut in two.

    9.6 % of pages open with a table, so this happens *before* any size cap.
    Without it the continuation has no header and is chunked as a second table.
    """
    merged: list[Block] = []
    for block in blocks:
        previous = merged[-1] if merged else None
        if (
            previous is not None
            and previous.table is not None
            and block.table is not None
            and previous.table.page_end + 1 == block.table.page_start
            and previous.table.format == block.table.format
            and previous.table.column_count == block.table.column_count
            and (
                block.table.continuation
                or _normalise_header(previous.table) == _normalise_header(block.table)
            )
        ):
            merged[-1] = _merge(previous, block)
        else:
            merged.append(block)
    return merged


def _merge(previous: Block, continuation: Block) -> Block:
    left, right = previous.table, continuation.table
    assert left is not None and right is not None

    # A continuation sometimes repeats the header; keeping both would double it.
    drop = 0
    if (
        right.header_rows
        and left.header_rows
        and _normalise(right.rows[0]) == _normalise(left.rows[0])
    ):
        drop = right.header_rows

    table = replace(
        left,
        raw=f"{left.raw}\n{right.raw}",
        rows=left.rows + right.rows[drop:],
        raw_rows=left.raw_rows + right.raw_rows[drop:],
        page_end=right.page_end,
        ragged=left.ragged or right.ragged,
    )
    return replace(previous, text=table.raw, page_end=right.page_end, table=table)


def _normalise(row: Sequence[str]) -> tuple[str, ...]:
    return tuple(cell.strip().lower() for cell in row)


def _normalise_header(table: TableBlock) -> tuple[tuple[str, ...], ...]:
    return tuple(_normalise(row) for row in table.header)
