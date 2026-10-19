"""Check that every extracted document is complete and self-consistent.

    uv run python scripts/verify_ocr.py            # data/ocr
    uv run python scripts/verify_ocr.py --dir data/ocr

A document is complete when:

* ``document.md`` exists and is non-empty;
* its ``<!-- page N -->`` markers run 1..N with no gap or repeat;
* N matches ``meta.json``;
* every ``![](assets/...)`` reference resolves to a file on disk.

Exits non-zero when anything fails, so it can gate a commit or a pull.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PAGE_MARKER = re.compile(r"<!-- page (\d+) -->")
IMAGE = re.compile(r"!\[\]\(([^)]+)\)")


def check(doc_dir: Path) -> list[str]:
    problems: list[str] = []
    markdown = doc_dir / "document.md"
    meta_file = doc_dir / "meta.json"

    if not markdown.is_file():
        return ["document.md missing"]
    text = markdown.read_text(encoding="utf-8")
    if not text.strip():
        return ["document.md empty"]

    numbers = [int(value) for value in PAGE_MARKER.findall(text)]
    if not numbers:
        problems.append("no page markers")
    elif numbers != list(range(1, len(numbers) + 1)):
        problems.append(f"page markers not contiguous: {numbers[:4]}...{numbers[-2:]}")

    if not meta_file.is_file():
        problems.append("meta.json missing")
    else:
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        if numbers and len(numbers) != meta.get("pages"):
            problems.append(f"{len(numbers)} markers but meta says {meta.get('pages')} pages")

    for reference in IMAGE.findall(text):
        if not (doc_dir / reference).is_file():
            problems.append(f"missing image {reference}")

    return problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify extracted OCR documents.")
    parser.add_argument("--dir", default="data/ocr", type=Path)
    args = parser.parse_args(argv)

    if not args.dir.is_dir():
        print(f"no such directory: {args.dir}")
        return 2

    documents = sorted(
        path for path in args.dir.iterdir() if path.is_dir() and not path.name.startswith("_")
    )
    if not documents:
        print(f"no documents in {args.dir}")
        return 2

    failures: list[tuple[str, list[str]]] = []
    pages = chars = figures = 0
    for document in documents:
        problems = check(document)
        if problems:
            failures.append((document.name, problems))
            continue
        text = (document / "document.md").read_text(encoding="utf-8")
        pages += len(PAGE_MARKER.findall(text))
        chars += len(text)
        meta = document / "meta.json"
        if meta.is_file():
            figures += json.loads(meta.read_text(encoding="utf-8")).get("figures", 0)

    print(f"documents {len(documents)} | pages {pages} | chars {chars:,} | figures {figures}")
    if failures:
        print(f"\n{len(failures)} document(s) failed:")
        for name, problems in failures:
            print(f"  {name[:8]}  " + "; ".join(problems))
        return 1
    print("all documents complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
