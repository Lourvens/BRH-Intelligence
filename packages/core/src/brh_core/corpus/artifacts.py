"""Resolve validated reading artifacts without exposing filesystem paths."""

import hashlib
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from brh_core.ingestion.artifacts import OcrArtifact


def artifact_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def official_pdf(url: str | None, page: int | None = None) -> str | None:
    if not url:
        return None
    parts = urlsplit(url)
    if parts.scheme != "https" or parts.hostname not in {"brh.ht", "www.brh.ht"}:
        return None
    if parts.username or parts.password:
        return None
    return urlunsplit(parts._replace(fragment=f"page={page}" if page else ""))


class ArtifactStore:
    def __init__(self, root: Path):
        self.root = root.resolve()

    def document(self, sha256: str) -> OcrArtifact:
        if not re.fullmatch("[a-f0-9]{64}", sha256):
            raise ValueError("Invalid document identity")
        path = (self.root / sha256 / "document.md").resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("Invalid artifact path")
        return OcrArtifact.load(path)

    def asset(self, sha256: str, name: str) -> Path:
        artifact = self.document(sha256)
        root = (artifact.markdown.parent / "assets").resolve()
        path = (root / name).resolve()
        if not path.is_relative_to(root) or path.suffix.lower() not in {
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".gif",
        }:
            raise ValueError("Invalid asset path")
        if not path.is_file():
            raise FileNotFoundError(name)
        return path
