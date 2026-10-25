"""Prose policy: pack paragraphs under their headings, never cross a division.

Measured: a section is p50 620 characters (~155 tokens) and 73 % are under 350
tokens, so "section = chunk" would emit fragments. Packing is the rule. The
counterweight is that 40.8 % of sections cross a page boundary, so a chunk's
pages are a range, and the section path is recorded per piece — a chunk that
contains two sub-sections must not claim the second one's path.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field

_SENTENCE = re.compile(r"(?<=[.!?])\s+")


@dataclass
class ProseBuffer:
    """Prose being packed. Each piece carries the section path it sits under."""

    pieces: list[tuple[str, int, tuple[str, ...]]] = field(default_factory=list)

    def empty(self) -> bool:
        return not self.pieces

    def has_body(self) -> bool:
        return any(not piece.startswith("#") for piece, _, _ in self.pieces)

    def clear(self) -> None:
        self.pieces.clear()

    def text(self) -> str:
        return "\n\n".join(piece for piece, _, _ in self.pieces)

    def pages(self) -> list[int]:
        return [page for _, page, _ in self.pieces]


@dataclass(frozen=True, slots=True)
class ProsePart:
    text: str
    pages: tuple[int, ...]
    section_path: tuple[str, ...]
    section_paths: tuple[tuple[str, ...], ...] = ()

    @property
    def page_start(self) -> int:
        return self.pages[0]

    @property
    def page_end(self) -> int:
        return self.pages[-1]


def pack(
    buffer: ProseBuffer,
    *,
    max_tokens: int,
    target_tokens: int | None = None,
    count_tokens: Callable[[str], int],
) -> list[ProsePart]:
    """Pack toward the target; split a paragraph only above the hard cap."""
    budget = max_tokens if target_tokens is None else target_tokens
    if count_tokens(buffer.text()) <= budget:
        paths = tuple(dict.fromkeys(piece[2] for piece in buffer.pieces))
        return [ProsePart(buffer.text(), tuple(buffer.pages()), paths[0], paths)]

    units: list[list[tuple[str, int, tuple[str, ...]]]] = []
    current: list[tuple[str, int, tuple[str, ...]]] = []
    groups = (
        [[piece] for piece in buffer.pieces]
        if target_tokens is None
        else _paragraph_groups(buffer, max_tokens=max_tokens, count_tokens=count_tokens)
    )
    for group in groups:
        candidate = "\n\n".join(text for text, _, _ in [*current, *group])
        if current and count_tokens(candidate) > budget:
            units.append(current)
            current = list(group)
        else:
            current.extend(group)
    if current:
        units.append(current)

    parts: list[ProsePart] = []
    for pieces in units:
        text = "\n\n".join(piece for piece, _, _ in pieces)
        pages = tuple(page for _, page, _ in pieces)
        section_path = pieces[0][2]
        paths = tuple(dict.fromkeys(piece[2] for piece in pieces))
        if count_tokens(text) <= max_tokens:
            parts.append(ProsePart(text, pages, section_path, paths))
        else:
            parts.extend(
                ProsePart(part, pages, section_path, paths)
                for part in split_sentences(
                    text,
                    max_tokens=max_tokens,
                    target_tokens=target_tokens,
                    count_tokens=count_tokens,
                )
            )
    return parts


def _paragraph_groups(
    buffer: ProseBuffer, *, max_tokens: int, count_tokens: Callable[[str], int]
) -> list[list[tuple[str, int, tuple[str, ...]]]]:
    """Keep heading runs with their following paragraph when targeting prose."""
    groups: list[list[tuple[str, int, tuple[str, ...]]]] = []
    pending: list[tuple[str, int, tuple[str, ...]]] = []
    for piece in buffer.pieces:
        pending.append(piece)
        if not piece[0].startswith("#"):
            if count_tokens("\n\n".join(part[0] for part in pending)) <= max_tokens:
                groups.append(pending)
            else:
                groups.extend([part] for part in pending)
            pending = []
    if pending:
        if count_tokens("\n\n".join(part[0] for part in pending)) <= max_tokens:
            groups.append(pending)
        else:
            groups.extend([part] for part in pending)
    return groups


def split_sentences(
    text: str,
    *,
    max_tokens: int,
    target_tokens: int | None = None,
    count_tokens: Callable[[str], int],
) -> list[str]:
    """Last resort for a paragraph over the cap; measured to be rare."""
    budget = max_tokens if target_tokens is None else target_tokens
    units: list[str] = []
    current = ""
    for sentence in (part for part in _SENTENCE.split(text) if part.strip()):
        candidate = f"{current} {sentence}".strip() if current else sentence
        if current and count_tokens(candidate) > budget:
            units.append(current)
            current = sentence
        else:
            current = candidate
    if current:
        units.append(current)
    return [
        piece
        for unit in units
        for piece in (
            [unit]
            if count_tokens(unit) <= max_tokens
            else _split_words(unit, max_tokens, count_tokens, target_tokens=target_tokens)
        )
    ]


def _split_words(
    text: str,
    max_tokens: int,
    count_tokens: Callable[[str], int],
    *,
    target_tokens: int | None = None,
) -> list[str]:
    """A single unpunctuated block still has to fit: cut on whitespace."""
    budget = max_tokens if target_tokens is None else target_tokens
    if count_tokens(text) <= budget:
        return [text]
    units: list[str] = []
    current: list[str] = []
    for word in text.split():
        if count_tokens(word) > budget:
            if current:
                units.append(" ".join(current))
                current = []
            units.extend(
                _split_long_token(word, max_tokens, count_tokens, target_tokens=target_tokens)
            )
            continue
        candidate = " ".join([*current, word])
        if current and count_tokens(candidate) > budget:
            units.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        units.append(" ".join(current))
    return units


def _split_long_token(
    text: str,
    max_tokens: int,
    count_tokens: Callable[[str], int],
    *,
    target_tokens: int | None = None,
) -> list[str]:
    """Bound pathological OCR identifiers without emitting an over-cap chunk."""
    budget = max_tokens if target_tokens is None else target_tokens
    parts: list[str] = []
    remaining = text
    while remaining:
        if count_tokens(remaining) <= budget:
            parts.append(remaining)
            break
        low, high = 1, len(remaining)
        best = 0
        while low <= high:
            middle = (low + high) // 2
            if count_tokens(remaining[:middle]) <= budget:
                best = middle
                low = middle + 1
            else:
                high = middle - 1
        if best == 0:
            # A Unicode code point may exceed the soft target, but never the cap.
            if count_tokens(remaining[:1]) > max_tokens:
                raise ValueError("max_tokens cannot fit a single Unicode code point")
            best = 1
        parts.append(remaining[:best])
        remaining = remaining[best:]
    return parts


def section_path(path: Sequence[tuple[int, str]]) -> tuple[str, ...]:
    return tuple(title for _, title in path)
