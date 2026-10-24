"""Write the skip list from the checkout alone.

Modal is retired: its volume was pulled and merged, so `data/ocr` holds every
document that exists. Deriving the list from the directory removes the last
dependency on a paid runner — refreshing the skip list used to mean a
`modal run`, which is a strange price for listing files.

    uv run python scripts/export_skip_list.py
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Write done_shas.txt from data/ocr.")
    parser.add_argument("--ocr", default=Path("data/ocr"), type=Path)
    parser.add_argument("--out", default=Path("data/ocr/done_shas.txt"), type=Path)
    args = parser.parse_args(argv)

    documents = sorted(
        path.name
        for path in args.ocr.iterdir()
        if path.is_dir() and path.name != "_ledger" and (path / "document.md").exists()
    )
    args.out.write_text("\n".join(documents) + "\n", encoding="utf-8")
    print(f"{len(documents)} document(s) -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
