"""Content-addressed storage for downloaded artefacts.

Raw bytes are stored under ``data/raw/web/<sha256>.<ext>``. Hashing the stream
*while* writing means identity is known without a second pass, and the file name
*is* the identity: identical bytes are stored once no matter how many URLs point
at them, and a re-run never rewrites an existing file.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class SavedContent:
    """Result of persisting one byte stream."""

    sha256: str
    path: Path
    size: int
    created: bool  # False when identical bytes were already on disk


class ContentStore:
    """A flat, content-addressed directory of downloaded files."""

    def __init__(self, root: Path) -> None:
        self.root = Path(root)

    def ensure(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)

    def path_for(self, sha256: str, suffix: str = ".pdf") -> Path:
        return self.root / f"{sha256}{suffix}"

    def has(self, sha256: str, suffix: str = ".pdf") -> bool:
        return self.path_for(sha256, suffix).is_file()

    def save(self, chunks: Iterable[bytes], *, suffix: str = ".pdf") -> SavedContent:
        """Stream ``chunks`` to disk, hashing as we go; keep one copy per hash."""
        self.ensure()
        digest = hashlib.sha256()
        size = 0
        fd, temp_name = tempfile.mkstemp(dir=self.root, prefix=".dl-", suffix=".part")
        temp_path = Path(temp_name)
        try:
            with os.fdopen(fd, "wb") as handle:
                for chunk in chunks:
                    digest.update(chunk)
                    size += len(chunk)
                    handle.write(chunk)
            sha256 = digest.hexdigest()
            target = self.path_for(sha256, suffix)
            if target.exists():
                temp_path.unlink()
                return SavedContent(sha256=sha256, path=target, size=size, created=False)
            os.replace(temp_path, target)
            return SavedContent(sha256=sha256, path=target, size=size, created=True)
        except BaseException:
            temp_path.unlink(missing_ok=True)
            raise
