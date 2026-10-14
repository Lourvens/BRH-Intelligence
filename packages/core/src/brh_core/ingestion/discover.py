"""Discovery — which files should be ingested.

Today: local PDFs under ``BRH_RAW_DIR``. Tomorrow: the same function grows a
web-crawler source behind the same return type.

TODO: implement.
"""

from __future__ import annotations

from pathlib import Path


def discover_pdfs(raw_dir: Path) -> list[Path]:
    """Return every PDF under ``raw_dir``, sorted for a stable order.

    Missing directory -> ``[]`` (not an error); sort so ingestion order is
    deterministic.
    """
    raise NotImplementedError("TODO: walk raw_dir for *.pdf")
