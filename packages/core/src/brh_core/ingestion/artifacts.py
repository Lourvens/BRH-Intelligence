"""Discover completed PaddleOCR artifacts without requiring their source PDFs."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from brh_core.ingestion.extract import ExtractedPage, InvalidOcrArtifact, _read_marked_pages

_SHA256 = re.compile(r"^[a-f0-9]{64}$")


class IncompleteOcrArtifact(RuntimeError):
    """The runner/pull has not published a complete artifact yet."""


@dataclass(frozen=True)
class OcrArtifact:
    markdown: Path
    sha256: str
    metadata: dict

    @classmethod
    def load(cls, markdown: Path) -> OcrArtifact:
        sha = markdown.parent.name
        if not _SHA256.fullmatch(sha):
            raise InvalidOcrArtifact(f"Invalid artifact identity: {sha}")
        try:
            metadata = json.loads((markdown.parent / "meta.json").read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError) as exc:
            raise IncompleteOcrArtifact(str(markdown)) from exc
        if not isinstance(metadata, dict):
            raise InvalidOcrArtifact(f"Invalid completion metadata: {markdown}")
        if metadata.get("sha256") != sha:
            raise InvalidOcrArtifact(f"Artifact directory and metadata SHA-256 differ: {markdown}")
        if not metadata.get("finished_at"):
            raise IncompleteOcrArtifact(str(markdown))
        pages = metadata.get("pages")
        if type(pages) is not int or pages <= 0:
            raise InvalidOcrArtifact(f"Invalid completed page count: {markdown}")
        if metadata.get("engine") != "paddleocr-vl":
            raise InvalidOcrArtifact(f"Unsupported extraction engine: {markdown}")
        return cls(markdown, sha, metadata)

    def read_pages(self) -> list[ExtractedPage]:
        pages = _read_marked_pages(self.markdown)
        expected = list(range(1, self.metadata["pages"] + 1))
        if list(pages) != expected:
            raise InvalidOcrArtifact(
                f"{self.markdown}: completion metadata expects {len(expected)} pages, "
                f"found markers {list(pages)}"
            )
        return [ExtractedPage(number, pages[number]) for number in expected]


def discover_ocr_markdown(root: Path) -> list[Path]:
    return sorted(
        path for path in root.glob("*/document.md") if _SHA256.fullmatch(path.parent.name)
    )
