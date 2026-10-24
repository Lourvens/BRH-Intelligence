"""The envelope: context a table needs to mean anything on its own.

Measured on the corpus: only 47.8 % of tables have a caption within three lines,
30.1 % carry their unit inside the block, and 0.4 % carry ``Source:``. So the
envelope is assembled from what surrounds the table — never invented. A missing
source stays ``None`` rather than becoming a plausible lie.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from brh_core.ingestion.chunking.blocks import Block, BlockKind, TableBlock
from brh_core.ingestion.chunking.patterns import CAPTION, PERIOD, SOURCE, UNIT


@dataclass(frozen=True, slots=True)
class Envelope:
    title: str | None = None
    unit: str | None = None
    period: str | None = None
    source: str | None = None
    context: str | None = None

    def line(self) -> str:
        parts = [self.title, self.context, self.unit, self.period]
        if self.source:
            parts.append(f"Source: {self.source}")
        return " — ".join(part for part in parts if part)

    def as_dict(self) -> dict[str, object]:
        return {
            "title": self.title,
            "unit": self.unit,
            "period": self.period,
            "source": self.source,
            "context": self.context,
        }


def table_caption(blocks: Sequence[Block], index: int, *, window: int = 2) -> str | None:
    """The caption line immediately above a table, if there is one (47.8 %)."""
    for offset in range(1, window + 1):
        position = index - offset
        if position < 0:
            return None
        block = blocks[position]
        if block.kind is BlockKind.paragraph and CAPTION.match(block.text):
            return block.text.splitlines()[0].strip()
        if block.kind is BlockKind.heading:
            return None
    return None


def build(
    blocks: Sequence[Block],
    index: int,
    path: Sequence[str],
    table: TableBlock,
) -> Envelope:
    """Assemble the envelope from the caption, the section and the neighbour."""
    caption = table_caption(blocks, index)
    heading = path[-1] if path else None
    before = blocks[index - 1] if index else None
    neighbour = before.text if before is not None and before.kind is BlockKind.paragraph else ""
    after = blocks[index + 1] if index + 1 < len(blocks) else None
    following = after.text if after is not None and after.kind is BlockKind.paragraph else ""
    context = "\n".join(
        part
        for part in (caption or "", heading or "", neighbour, table.raw, following)
        if part
    )

    unit = UNIT.search(context)
    source = SOURCE.search(context)
    table_context = _compact_context(neighbour, caption)
    return Envelope(
        title=caption or heading,
        unit=unit.group(0).strip() if unit else None,
        period=_period(caption, table),
        source=source.group(1).strip()[:160] if source else None,
        context=table_context,
    )


def _period(caption: str | None, table: TableBlock) -> str | None:
    for text in (caption or "", table.raw):
        match = PERIOD.search(text)
        if match:
            return match.group(0)
    return None


def _compact_context(neighbour: str, caption: str | None) -> str | None:
    """Keep form/report qualifiers without embedding an unbounded paragraph."""
    if not neighbour or (caption and neighbour.strip() == caption.strip()):
        return None
    compact = " ".join(neighbour.split())
    return compact[:180] or None
