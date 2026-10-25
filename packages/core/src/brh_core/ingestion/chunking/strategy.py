"""Chunking strategy ``v2`` — structure-aware, deterministic, token-capped.

The traversal is deliberately dumb: walk the blocks once, maintain the heading
path, and delegate every decision to a policy module — :mod:`prose` for text,
:mod:`tables` for grids, :mod:`envelope` for context. This module owns only
sequencing, chunk identity and provenance.

Rules come from ``experiments/chunking/corpus-stats.json``:

* a section is not a chunk (p50 155 tokens), so prose is packed;
* dense tables exceed the safe 448-token budget, so tables are partitioned;
* 40.8 % of sections and 9.6 % of pages cross a table or section boundary,
  so pages are ranges and tables are stitched before splitting;
* a "provision" is usually ``### 1.`` plus ``a) b) c)``, not ``Article N``.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Sequence

from brh_core.ingestion.chunking import envelope as envelopes
from brh_core.ingestion.chunking import prose as prose_policy
from brh_core.ingestion.chunking import tables as table_policy
from brh_core.ingestion.chunking.blocks import Block, BlockKind, blocks_from_pages
from brh_core.ingestion.chunking.patterns import CAPTION, PROVISION_ITEM, REGULATORY
from brh_core.ingestion.chunking.tokens import DEFAULT_MAX_TOKENS, estimate_tokens
from brh_core.ingestion.extract import ExtractedPage
from brh_core.models import Chunk, ChunkType

CHUNKING_VERSION = "v2"
_TOC_LINE = re.compile(r"\.{3,}\s*\d+\s*$")


def chunker_id(
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    target_tokens: int | None = None,
    tokenizer_id: str = "safe-estimate-v2",
) -> str:
    """Stable id for the index key, including the token-counting contract."""
    _validate_target(target_tokens, max_tokens)
    identity = f"structure-{CHUNKING_VERSION}:{max_tokens}:{tokenizer_id}"
    return identity if target_tokens is None else f"{identity}:target={target_tokens}"


class StructureChunker:
    """Turn blocks into chunks, deterministically and within a token cap."""

    def __init__(
        self,
        *,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        target_tokens: int | None = None,
        count_tokens: Callable[[str], int] | None = None,
    ) -> None:
        if max_tokens <= 0:
            raise ValueError("max_tokens must be positive")
        _validate_target(target_tokens, max_tokens)
        self._target = target_tokens
        self._max = max_tokens
        self._count = count_tokens or estimate_tokens
        self._min_provision = max(80, max_tokens // 6)

    def split(self, document_id: str, blocks: Sequence[Block]) -> list[Chunk]:
        self._document_id = document_id
        self._ordinals: dict[int, int] = {}
        self._tables = 0
        self._top_level = min(
            (block.level for block in blocks if block.kind is BlockKind.heading), default=2
        )
        self._regulatory = _is_regulatory(blocks)

        chunks: list[Chunk] = []
        path: list[tuple[int, str]] = []
        buffer = prose_policy.ProseBuffer()

        for index, block in enumerate(blocks):
            if block.kind is BlockKind.heading:
                if block.level == self._top_level and buffer.has_body():
                    chunks.extend(self._emit_prose(buffer))
                    buffer.clear()
                while path and path[-1][0] >= block.level:
                    path.pop()
                path.append((block.level, block.text))
                buffer.pieces.append(
                    (f"{'#' * block.level} {block.text}", block.page_start, _path(path))
                )
                continue

            if block.kind is BlockKind.table and block.table is not None:
                # The caption line above a table is the table's title; emitting
                # it as prose would give the index a four-word chunk and repeat
                # it inside the envelope.
                if buffer.pieces and CAPTION.match(buffer.pieces[-1][0]):
                    buffer.pieces.pop()
                if buffer.has_body():
                    chunks.extend(self._emit_prose(buffer))
                buffer.clear()
                chunks.extend(self._emit_table(block, index, blocks, path))
                continue

            if (
                self._regulatory
                and PROVISION_ITEM.match(block.text)
                and buffer.has_body()
                and self._count(buffer.text()) >= self._min_provision
            ):
                chunks.extend(self._emit_prose(buffer))
                buffer.clear()
            buffer.pieces.append((block.text, block.page_start, _path(path)))

        if buffer.has_body():
            chunks.extend(self._emit_prose(buffer))
        return chunks

    # --- prose ----------------------------------------------------------

    def _emit_prose(self, buffer: prose_policy.ProseBuffer) -> list[Chunk]:
        if buffer.empty():
            return []
        chunk_type = ChunkType.provision if self._regulatory else ChunkType.prose
        return [
            self._make_chunk(
                text=part.text,
                page_start=part.page_start,
                page_end=part.page_end,
                chunk_type=chunk_type,
                section_path=part.section_path,
                metadata={
                    "section_paths": [list(path) for path in part.section_paths],
                    "navigation": _is_navigation(part.text, part.section_paths),
                },
            )
            for part in prose_policy.pack(
                buffer,
                max_tokens=self._max,
                target_tokens=None if self._regulatory else self._target,
                count_tokens=self._count,
            )
        ]

    # --- tables ---------------------------------------------------------

    def _emit_table(
        self,
        block: Block,
        index: int,
        blocks: Sequence[Block],
        path: Sequence[tuple[int, str]],
    ) -> list[Chunk]:
        table = block.table
        assert table is not None
        self._tables += 1
        number = self._tables
        table_id = f"{self._document_id}:t{number}"

        envelope = envelopes.build(blocks, index, _path(path), table)
        chunk_type = ChunkType.series if table_policy.is_series(table) else ChunkType.table
        header = table.header_markup
        parts = table_policy.partition(
            table,
            max_tokens=self._max,
            count_tokens=self._count,
            envelope_line=envelope.line(),
            header=header,
        )
        total = len(table.data_rows)
        ids = [
            (
                f"{self._document_id}:p{table.page_start}:t{number}:r{part.start}-{part.end}"
                f"{':f' + str(part.fragment_index) if part.fragment_count > 1 else ''}"
            )
            for part in parts
        ]

        chunks: list[Chunk] = []
        for position, part in enumerate(parts):
            effective_header = header if part.header_override is None else part.header_override
            prefix = table_policy.part_prefix(
                envelope.line(),
                position + 1,
                len(parts),
                part.start,
                part.end,
                total,
                fragment_index=part.fragment_index,
                fragment_count=part.fragment_count,
            )
            text = "\n".join(piece for piece in (prefix, effective_header, part.rows) if piece)
            # A single row (or a header with no data) can be unsplittable; say so
            # rather than pretending the cap held.
            oversized = part.oversized or self._count(text) > self._max
            chunks.append(
                self._make_chunk(
                    text=text,
                    page_start=table.page_start,
                    page_end=table.page_end,
                    chunk_type=chunk_type,
                    section_path=_path(path),
                    chunk_id=ids[position],
                    metadata={
                        "table_id": table_id,
                        "part": position + 1,
                        "part_count": len(parts),
                        "row_start": part.start,
                        "row_end": part.end,
                        "row_total": total,
                        "header_repeated": bool(header),
                        "header_oversized": part.header_override == "",
                        "ragged": table.ragged,
                        "format": table.format,
                        "envelope": envelope.as_dict(),
                        "oversized_row": oversized,
                        "row_fragment": part.fragment_index,
                        "row_fragment_count": part.fragment_count,
                        "prev_chunk_id": ids[position - 1] if position else None,
                        "next_chunk_id": ids[position + 1] if position + 1 < len(ids) else None,
                    },
                )
            )
        return chunks

    # --- chunk construction ---------------------------------------------

    def _make_chunk(
        self,
        *,
        text: str,
        page_start: int,
        page_end: int,
        chunk_type: ChunkType,
        section_path: Sequence[str],
        chunk_id: str | None = None,
        metadata: dict[str, object] | None = None,
    ) -> Chunk:
        ordinal = self._ordinals.get(page_start, 0)
        self._ordinals[page_start] = ordinal + 1
        return Chunk(
            chunk_id=chunk_id or f"{self._document_id}:p{page_start}:c{ordinal}",
            document_id=self._document_id,
            page_number=page_start,
            ordinal=ordinal,
            text=text,
            page_end=page_end,
            chunk_type=chunk_type,
            section_path=tuple(section_path),
            token_count=self._count(text),
            metadata=metadata or {},
        )


def _path(path: Sequence[tuple[int, str]]) -> tuple[str, ...]:
    return tuple(title for _, title in path)


def _is_regulatory(blocks: Sequence[Block]) -> bool:
    # Lettered paragraphs are common in annual reports and audit notes, so they
    # are not sufficient evidence by themselves. Require an explicit regulatory
    # signal in the document lead before changing every prose chunk's type.
    lead = " ".join(block.text for block in blocks[:8] if block.kind is not BlockKind.table)
    return bool(REGULATORY.search(lead))


def _is_navigation(text: str, paths: Sequence[tuple[str, ...]]) -> bool:
    """Mark tables of contents without discarding their useful section names."""
    path_text = " ".join(" ".join(path) for path in paths).lower()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if "table des matières" in path_text or "table des matieres" in path_text:
        return True
    return bool(lines) and sum(bool(_TOC_LINE.search(line)) for line in lines) / len(lines) >= 0.6


def chunk_pages(
    document_id: str,
    pages: Sequence[ExtractedPage],
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    target_tokens: int | None = None,
    count_tokens: Callable[[str], int] | None = None,
) -> list[Chunk]:
    """Chunk pages with an optional prose target and a hard structural cap."""
    blocks = blocks_from_pages(pages)
    return StructureChunker(
        max_tokens=max_tokens, target_tokens=target_tokens, count_tokens=count_tokens
    ).split(document_id, blocks)


def _validate_target(target_tokens: int | None, max_tokens: int) -> None:
    if target_tokens is not None and not 0 < target_tokens <= max_tokens:
        raise ValueError("target_tokens must be positive and no greater than max_tokens")
