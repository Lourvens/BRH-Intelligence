"""Merge an OCR output directory into the local corpus.

Whatever produced the documents — Modal's volume, a Colab VM with output on
Drive, a laptop — the same rules apply when folding them into one tree:

* a document is copied only when the destination has no complete ``document.md``,
  so a re-merge never rewrites finished work;
* a destination document that differs from the incoming one is reported, not
  overwritten: silent replacement is how a good extraction gets lost;
* ledger events from both sides are unioned by ``(sha256, event, ts)``, so
  merging twice is not a duplication bug.

    uv run python scripts/merge_ocr.py --from /mnt/drive/brh-ocr/ocr
    uv run python scripts/merge_ocr.py --from stage/ocr --into data/ocr
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

DOCUMENT = "document.md"


def _complete(directory: Path) -> bool:
    document = directory / DOCUMENT
    return document.is_file() and document.stat().st_size > 0


def merge_documents(source: Path, target: Path) -> tuple[list[str], list[str], list[str]]:
    copied: list[str] = []
    kept: list[str] = []
    conflicts: list[str] = []
    target.mkdir(parents=True, exist_ok=True)

    for incoming in sorted(path for path in source.iterdir() if path.is_dir()):
        if incoming.name.startswith("_") or not _complete(incoming):
            continue
        destination = target / incoming.name
        if _complete(destination):
            if (destination / DOCUMENT).read_bytes() != (incoming / DOCUMENT).read_bytes():
                conflicts.append(incoming.name)
            else:
                kept.append(incoming.name)
            continue
        shutil.copytree(incoming, destination, dirs_exist_ok=True)
        copied.append(incoming.name)
    return copied, kept, conflicts


def _events(source: Path) -> list[str]:
    """Every ledger line the source has: a merged state.jsonl, per-document
    ledgers, or both. The Modal volume only has ``_ledger/*.jsonl``; a Colab
    output on Drive has ``state.jsonl``."""
    lines: list[str] = []

    def read(path: Path) -> None:
        lines.extend(
            line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()
        )

    state = source / "state.jsonl"
    if state.is_file():
        read(state)
    ledger = source / "_ledger"
    if ledger.is_dir():
        for path in sorted(ledger.glob("*.jsonl")):
            read(path)
    return lines


def merge_ledgers(source: Path, target: Path) -> int:
    """Union ledger events; returns how many were new."""
    incoming = _events(source)
    if not incoming:
        return 0
    destination = target / "state.jsonl"
    known: set[tuple[str, str, str]] = set()
    lines: list[str] = []
    if destination.is_file():
        for line in destination.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            known.add((row.get("sha256", ""), row.get("event", ""), row.get("ts", "")))
            lines.append(line)

    added = 0
    for line in incoming:
        row = json.loads(line)
        key = (row.get("sha256", ""), row.get("event", ""), row.get("ts", ""))
        if key in known:
            continue
        known.add(key)
        lines.append(line)
        added += 1

    if added:
        destination.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return added


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Merge OCR output into the local corpus.")
    parser.add_argument("--from", dest="source", required=True, type=Path)
    parser.add_argument("--into", dest="target", default=Path("data/ocr"), type=Path)
    args = parser.parse_args(argv)

    if not args.source.is_dir():
        print(f"no such directory: {args.source}")
        return 2

    copied, kept, conflicts = merge_documents(args.source, args.target)
    events = merge_ledgers(args.source, args.target)

    print(f"copied {len(copied)} new document(s), {len(kept)} already present, "
          f"{len(conflicts)} conflicting")
    if events:
        print(f"merged {events} ledger event(s) into {args.target / 'state.jsonl'}")
    if conflicts:
        print("\nconflicting documents were kept as they are (incoming discarded):")
        for sha in conflicts:
            print(f"  {sha[:8]}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
