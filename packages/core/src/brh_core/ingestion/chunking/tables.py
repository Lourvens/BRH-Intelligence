"""Table policy: how a table becomes one chunk, or several linked ones.

Two rules, both measured rather than assumed:

* **repeat the structure, never the data** — overlapping rows duplicate values,
  and any sum the model computes would double-count. Parts are linked by
  ``table_id``/``part``/``prev``/``next`` instead.
* **break at group boundaries before size boundaries** — a table cut mid-year
  is worse than a smaller chunk, so a year change ends a part even when there
  is room left.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from brh_core.ingestion.chunking.blocks import TableBlock
from brh_core.ingestion.chunking.patterns import PERIOD_CELL, YEAR

#: Same shape as a real span, slightly longer, so the fit test never
#: underestimates the label it will actually carry.
_SPAN_PROBE = "lignes 9999 à 9999/9999 (partie 99/99)"
_FRAGMENT_PROBE = f"{_SPAN_PROBE} fragment 99/99"


@dataclass(frozen=True, slots=True)
class TablePart:
    """One emitted table chunk: a contiguous, inclusive row range (1-based)."""

    start: int
    end: int
    rows: str
    oversized: bool = False
    fragment_index: int = 1
    fragment_count: int = 1
    header_override: str | None = None


def is_series(table: TableBlock) -> bool:
    """Periods down the first column, or across the header (transposed)."""
    data = table.data_rows
    if len(data) < 5:
        return False
    first = [row[0] for row in data if row]
    if first and sum(bool(PERIOD_CELL.match(cell)) for cell in first) / len(first) >= 0.6:
        return True
    for row in table.header:
        cells = [cell for cell in row[1:] if cell]
        if len(cells) < 2:
            continue
        if sum(bool(PERIOD_CELL.match(cell)) for cell in cells) / len(cells) >= 0.5:
            return True
    return False


def partition(
    table: TableBlock,
    *,
    max_tokens: int,
    count_tokens: Callable[[str], int],
    envelope_line: str,
    header: str,
) -> list[TablePart]:
    """Row ranges that each fit the budget left by the envelope and header."""
    data = table.data_rows
    if not data:
        if fits_header(header, envelope_line, max_tokens, count_tokens):
            return [TablePart(0, 0, "")]
        fragments = _split_text(
            header, envelope_line=envelope_line, max_tokens=max_tokens, count_tokens=count_tokens
        )
        return [
            TablePart(
                0,
                0,
                fragment,
                fragment_index=index + 1,
                fragment_count=len(fragments),
                header_override="",
            )
            for index, fragment in enumerate(fragments)
        ]

    header_override = None
    effective_header = header
    if not fits_header(header, envelope_line, max_tokens, count_tokens):
        # A pathological OCR header cannot be repeated without violating the
        # embedding contract. Keep the row data retrievable and mark the loss
        # in metadata rather than silently emitting an over-cap chunk.
        header_override = ""
        effective_header = ""

    measured: dict[str, int] = {}

    def fits(rows_text: str) -> bool:
        """Measure the shape that will actually be emitted, prefix included.

        Counting the envelope separately would use the prose ratio while the
        final chunk is measured with the denser tabular one — that leak is what
        pushed real chunks over the cap.
        """
        probe = "\n".join(
            piece
            for piece in (envelope_line, _FRAGMENT_PROBE, effective_header, rows_text)
            if piece
        )
        token_count = measured.get(probe)
        if token_count is None:
            token_count = count_tokens(probe)
            measured[probe] = token_count
        return token_count <= max_tokens

    # A table that fits is never fragmented just because it changes year.
    def render_rows(indices: range) -> str:
        raw = table.render(indices)
        semantic = table.semantic_rows(indices)
        return "\n".join(part for part in (raw, semantic) if part)

    whole = render_rows(range(len(data)))
    if fits(whole):
        return [TablePart(1, len(data), whole, header_override=header_override)]

    keys = [_group_key(row) for row in data]

    parts: list[TablePart] = []
    start = 0
    while start < len(data):
        end = start
        while end < len(data):
            if not fits(render_rows(range(start, end + 1))):
                break
            if end > start and keys[end] is not None and keys[end] != keys[end - 1]:
                break
            end += 1

        oversized = end == start
        if oversized:
            row = table.data_rows[start]
            fragments = _split_row(
                row,
                table=table,
                envelope_line=envelope_line,
                header=effective_header,
                max_tokens=max_tokens,
                count_tokens=count_tokens,
            )
            parts.extend(
                TablePart(
                    start + 1,
                    start + 1,
                    fragment,
                    fragment_index=index + 1,
                    fragment_count=len(fragments),
                    header_override=header_override,
                )
                for index, fragment in enumerate(fragments)
            )
            start += 1
            continue
        parts.append(
            TablePart(
                start + 1,
                end,
                render_rows(range(start, end)),
                header_override=header_override,
            )
        )
        start = end
    return parts


def fits_header(
    header: str,
    envelope_line: str,
    max_tokens: int,
    count_tokens: Callable[[str], int],
) -> bool:
    probe = "\n".join(
        piece for piece in (envelope_line, _FRAGMENT_PROBE, header) if piece
    )
    return count_tokens(probe) <= max_tokens


def _split_text(
    text: str,
    *,
    envelope_line: str,
    max_tokens: int,
    count_tokens: Callable[[str], int],
) -> list[str]:
    """Split header-only OCR text with the same conservative probe as rows."""
    parts: list[str] = []
    remaining = text
    while remaining:
        if fits_header(remaining, envelope_line, max_tokens, count_tokens):
            parts.append(remaining)
            break
        low, high = 1, len(remaining)
        best = 1
        while low <= high:
            middle = (low + high) // 2
            if fits_header(remaining[:middle], envelope_line, max_tokens, count_tokens):
                best = middle
                low = middle + 1
            else:
                high = middle - 1
        cut = remaining.rfind(" ", 0, best + 1)
        if cut <= 0:
            cut = best
        parts.append(remaining[:cut].strip())
        remaining = remaining[cut:].strip()
    return parts or [""]


def _split_row(
    row: Sequence[str],
    *,
    table: TableBlock,
    envelope_line: str,
    header: str,
    max_tokens: int,
    count_tokens: Callable[[str], int],
) -> list[str]:
    """Split a pathological OCR row without allowing embedding truncation."""
    if table.format == "gfm":
        text = "| " + " | ".join(cell or " " for cell in row) + " |"
    else:
        text = table.semantic_row(row)

    # Repeat the row label on every fragment. A character-only continuation
    # otherwise becomes a list of numbers with no recoverable subject.
    fragment_prefix = ""
    fragment_body = text
    if table.format == "html" and ": " in text:
        fragment_prefix, fragment_body = text.split(": ", 1)
        fragment_prefix += ": "

    def fits(candidate: str) -> bool:
        probe = "\n".join(
            piece for piece in (envelope_line, _FRAGMENT_PROBE, header, candidate) if piece
        )
        return count_tokens(probe) <= max_tokens

    fragments: list[str] = []
    remaining = fragment_body
    while remaining:
        candidate = f"{fragment_prefix}{remaining}" if fragment_prefix else remaining
        if fits(candidate):
            fragments.append(candidate)
            break
        low, high = 1, len(remaining)
        best = 1
        while low <= high:
            middle = (low + high) // 2
            body_candidate = remaining[:middle].rstrip()
            candidate = f"{fragment_prefix}{body_candidate}" if fragment_prefix else body_candidate
            if body_candidate and fits(candidate):
                best = middle
                low = middle + 1
            else:
                high = middle - 1
        cut = remaining.rfind(" ", 0, best + 1)
        if cut <= 0:
            cut = best
        body_fragment = remaining[:cut].strip()
        fragments.append(f"{fragment_prefix}{body_fragment}" if fragment_prefix else body_fragment)
        remaining = remaining[cut:].strip()
    return fragments or [""]


def part_prefix(
    envelope_line: str,
    part: int,
    count: int,
    start: int,
    end: int,
    total: int,
    *,
    fragment_index: int = 1,
    fragment_count: int = 1,
) -> str:
    """The derived first line; also what gets embedded, so the part stays findable."""
    if count == 1:
        return envelope_line
    span = f"lignes {start} à {end}/{total} (partie {part}/{count})"
    if fragment_count > 1:
        span += f" fragment {fragment_index}/{fragment_count}"
    return f"{envelope_line} — {span}" if envelope_line else span


def _group_key(row: Sequence[str]) -> str | None:
    """Group consecutive rows by year so a table is not cut mid-period."""
    for cell in row:
        match = YEAR.search(cell)
        if match:
            return match.group(0)
    return None
