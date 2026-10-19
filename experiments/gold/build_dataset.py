"""Build the evaluation dataset from the per-document reference.

One JSONL row per page, so an engine can be run on `source.pdf` page `page` and
compared against `reference_md` / `reference_txt`.

    cd experiments && uv run python gold/build_dataset.py           # write
    cd experiments && uv run python gold/build_dataset.py --check   # verify no drift

`dataset.jsonl` is **derived**: the reference in `reference/<sha256>.md` is the
source of truth, and rebuilding is deterministic. `--check` fails if the
committed file no longer matches the reference, so the two cannot drift apart.

Rows carry their own provenance (tier, version, job, credits) because a benchmark
result is only reproducible with the exact parse that produced the reference.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import sys

from build_reference import REFERENCE, RECORD, markdown_to_text, read_document

HERE = pathlib.Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
PROFILES = HERE / "page-profiles.json"
DATASET = HERE / "dataset.jsonl"


def build() -> list[dict]:
    manifest = json.loads(MANIFEST.read_text())
    record = json.loads(RECORD.read_text())
    profiles = {
        (p["sha"], p["page"]): p for p in json.loads(PROFILES.read_text())
    }

    eval_docs = manifest["eval"]
    ci = set(manifest.get("ci", {}))
    rows: list[dict] = []

    for sha in eval_docs:
        document = record["documents"].get(sha)
        if not document or "error" in document:
            continue
        markdown = read_document(REFERENCE / f"{sha}.md")
        for page, body in sorted(markdown.items()):
            scored = document["pages"].get(str(page))
            if scored is None:
                continue
            profile = profiles.get((sha, page), {})
            rows.append(
                {
                    "id": f"{sha[:8]}-p{page:03d}",
                    "document": sha,
                    "page": page,
                    "splits": ["eval"] + (["ci"] if sha in ci else []),
                    "class": scored["class"],
                    "scanned": scored["scanned"],
                    "status": scored["status"],
                    "reason": scored["reason"],
                    "reading_order": scored["reading_order"],
                    "has_table": scored["has_table"],
                    "source": {"pdf": eval_docs[sha]["file"], "page": page},
                    "document_meta": {
                        "title": eval_docs[sha].get("title", ""),
                        "year": eval_docs[sha].get("year"),
                        "url": eval_docs[sha].get("url"),
                        "pages": eval_docs[sha].get("pages"),
                        "dpi": profile.get("dpi"),
                    },
                    "reference_md": body,
                    "reference_txt": markdown_to_text(body),
                    "metrics": {
                        "content_f1": scored["content_f1"],
                        "order_wer": scored["order_wer"],
                        "expansion_ratio": scored["expansion_ratio"],
                        "chars": scored["chars"],
                        "words": scored["words"],
                        "confidence": scored["confidence"],
                    },
                    "provenance": {
                        "provider": record["provider"],
                        "tier": record["tier"],
                        "version": record["version"],
                        "job_id": document.get("job_id"),
                        "credits": document.get("credits"),
                    },
                }
            )
    return rows


def render(rows: list[dict]) -> str:
    return "".join(
        json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows
    )


def main() -> None:
    rows = build()
    text = render(rows)
    check = "--check" in sys.argv

    if check:
        if not DATASET.is_file():
            raise SystemExit(f"{DATASET.name} is missing — run without --check")
        if DATASET.read_text(encoding="utf-8") != text:
            raise SystemExit(
                "dataset.jsonl is stale — rebuild it with "
                "`uv run python gold/build_dataset.py`"
            )
        print(f"{DATASET.name} matches the reference ({len(rows)} rows)")
        return

    DATASET.write_text(text, encoding="utf-8")

    statuses: dict[str, int] = {}
    classes: dict[str, int] = {}
    for row in rows:
        statuses[row["status"]] = statuses.get(row["status"], 0) + 1
        classes[row["class"]] = classes.get(row["class"], 0) + 1

    digest = hashlib.sha256(text.encode()).hexdigest()[:12]
    print(f"rows      : {len(rows)}")
    print(f"documents : {len({row['document'] for row in rows})}")
    print(f"bytes     : {len(text.encode()):,}")
    print(f"sha256    : {digest}…")
    for status, count in sorted(statuses.items()):
        print(f"  {status:<11} {count}")
    print()
    for name, count in sorted(classes.items(), key=lambda kv: -kv[1]):
        print(f"  {name:<24} {count}")
    print(f"written   : {DATASET}")


if __name__ == "__main__":
    main()
