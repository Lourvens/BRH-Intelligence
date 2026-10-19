"""Remove the scratch an OCR batch leaves behind, without touching a document.

The corpus product is ``<sha>/document.md`` plus ``<sha>/assets/`` and
``meta.json``. Everything else under an output directory is either redundant or
a artefact of an interrupted run:

* ``<sha>/.work/`` — per-page crops the engine wrote; assembled output has
  already been copied into ``assets/``, so the crops are duplicates;
* ``*.tmp`` — staged writes that a kill left behind (``document.md`` itself is
  written atomically, so a ``.tmp`` file is never the real document);
* ``_ledger/`` — the per-document ledgers, useful only until they are merged
  into ``state.jsonl`` (``--ledger`` drops them);
* ``__pycache__`` — never belongs in a data directory.

    uv run python scripts/purge_ocr.py                 # dry run
    uv run python scripts/purge_ocr.py --apply
    uv run python scripts/purge_ocr.py --apply --ledger
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def measure(path: Path) -> int:
    if path.is_file():
        return path.stat().st_size
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def find(root: Path, ledger: bool) -> list[Path]:
    targets: list[Path] = []
    for path in root.rglob("*"):
        name = path.name
        scratch = (
            (name == ".work" and path.is_dir())
            or (name == "__pycache__" and path.is_dir())
            or (name.endswith(".tmp") and path.is_file())
            or (ledger and name == "_ledger" and path.is_dir() and path.parent == root)
        )
        if scratch:
            targets.append(path)
    return sorted(targets)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Remove OCR scratch, keep documents.")
    parser.add_argument("--dir", default=Path("data/ocr"), type=Path)
    parser.add_argument("--ledger", action="store_true", help="Also drop merged _ledger/ files.")
    parser.add_argument("--apply", action="store_true",
                        help="Actually delete; default is a dry run.")
    args = parser.parse_args(argv)

    if not args.dir.is_dir():
        print(f"no such directory: {args.dir}")
        return 2

    before = sum(1 for _ in args.dir.glob("*/document.md"))
    targets = find(args.dir, args.ledger)

    freed = 0
    for path in targets:
        size = measure(path)
        freed += size
        print(f"  {'delete' if args.apply else 'would delete'} "
              f"{path.relative_to(args.dir)}  ({size / 1024:.0f} kB)")
        if args.apply:
            shutil.rmtree(path) if path.is_dir() else path.unlink()

    after = sum(1 for _ in args.dir.glob("*/document.md"))
    print()
    print(f"{len(targets)} item(s), {freed / 1024 / 1024:.1f} MB "
          f"{'removed' if args.apply else 'to remove (dry run)'}")
    print(f"documents: {before} before, {after} after")
    if after != before:
        print("a document disappeared — this should be impossible")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
