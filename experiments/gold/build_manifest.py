"""Adopt a human document selection as the benchmark evaluation set.

The selection lives in `documents/`: PDFs named by their own sha256,
chosen by hand from the candidate shortlist (`candidates.json`). This script
verifies each file against its name, derives the classes it covers, picks the CI
subset, and writes `manifest.json`.

It never invents documents — adding one is a human decision, and the missing
classes are reported rather than quietly filled.

    uv run python experiments/gold/build_manifest.py
"""

from __future__ import annotations

import hashlib
import json
import pathlib

import pymupdf

HERE = pathlib.Path(__file__).resolve().parent
CHOSEN = HERE / "documents"
PAGES = HERE / "page-profiles.json"

# The classes the CI gate must see. Keeping this short is the point: the gate has
# to run in seconds, and these four are the ones an engine regression shows up in.
CI_CLASSES = ("scan/bad", "scan/ok", "digital/text-only", "digital/table")

ALL_CLASSES = (
    "blank",
    "scan/bad",
    "scan/ok",
    "scan/good",
    "digital/text-only",
    "digital/table",
    "digital/2col",
    "digital/cover",
    "digital/figure",
    "digital/table+2col",
    "digital/table+figure",
    "digital/figure+2col",
    "digital/table+figure+2col",
)


def page_class(page: dict) -> str:
    if page["scanned"]:
        if not page["colours"]:
            return "blank"
        dpi = page["dpi"]
        return "scan/" + ("bad" if dpi < 150 else "ok" if dpi < 250 else "good")
    if page.get("cover"):
        return "digital/cover"
    tags = [
        name
        for name, on in (
            ("table", page["table"]),
            ("figure", page["figure"]),
            ("2col", page["columns"]),
        )
        if on
    ]
    return "digital/" + ("+".join(tags) if tags else "text-only")


def main() -> None:
    profiles: dict[str, dict] = {}
    for page in json.loads(PAGES.read_text()):
        doc = profiles.setdefault(
            page["sha"],
            {
                "title": page["title"],
                "year": page["year"],
                "url": page["url"],
                "pages": page["pages_in_doc"],
                "classes": {},
            },
        )
        cls = page_class(page)
        doc["classes"][cls] = doc["classes"].get(cls, 0) + 1

    entries: dict[str, dict] = {}
    problems: list[str] = []
    for path in sorted(CHOSEN.glob("*.pdf")):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != path.stem:
            problems.append(f"{path.name}: bytes hash to {digest}")
            continue
        profile = profiles.get(digest)
        if profile is None:
            problems.append(f"{path.name}: not in the profiled corpus")
            continue
        doc = pymupdf.open(path)
        pages = doc.page_count
        doc.close()
        if pages != profile["pages"]:
            problems.append(f"{path.name}: {pages} pages on disk, {profile['pages']} profiled")
        entries[digest] = {
            "sha256": digest,
            "file": f"documents/{digest}.pdf",
            "title": profile["title"],
            "year": profile["year"],
            "url": profile["url"],
            "pages": profile["pages"],
            "bytes": path.stat().st_size,
            "classes": sorted(profile["classes"]),
            "pages_per_class": profile["classes"],
        }

    covered = {cls for entry in entries.values() for cls in entry["classes"]}
    missing = [cls for cls in ALL_CLASSES if cls not in covered]

    # CI subset: fewest pages that still see every class the gate cares about
    remaining = {cls for cls in CI_CLASSES if cls in covered}
    ci: list[str] = []
    pool = list(entries.values())
    while remaining and pool:
        def rank(entry: dict) -> tuple:
            gain = len(remaining & set(entry["classes"]))
            return (gain, -entry["pages"], -entry["bytes"])

        best = max(filter(lambda e: rank(e)[0] > 0, pool), key=rank, default=None)
        if best is None:
            break
        remaining -= set(best["classes"]) & remaining
        ci.append(best["sha256"])
        pool.remove(best)

    manifest = {
        "selection": {
            "generated": "2026-10-16",
            "unit": "document",
            "chosen_by": "human, from candidates.json",
            "source": "the 116-document stratified sample of brh.ht (--sample 90)",
            "ci_classes": list(CI_CLASSES),
            "class_axis": "format x resolution x content, per page; a document "
                          "joins the set for every class it contains",
        },
        "coverage": {
            "covered": [cls for cls in ALL_CLASSES if cls in covered],
            "missing": missing,
        },
        "eval": entries,
        "ci": {sha: entries[sha] for sha in sorted(ci)},
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False))

    for problem in problems:
        print(f"WARNING {problem}")
    print(f"{'sha':<10}{'pg':>4}{'kB':>8}{'yr':>6}  classes")
    print("-" * 96)
    for sha, entry in sorted(entries.items()):
        short = ", ".join(
            c.replace("digital/", "").replace("scan/", "S:") for c in entry["classes"]
        )
        print(f"{sha[:8]:<10}{entry['pages']:>4}{entry['bytes'] // 1024:>8}"
              f"{str(entry['year']):>6}  {short}")
    print()
    print(f"eval set : {len(entries)} documents, "
          f"{sum(e['pages'] for e in entries.values())} pages, "
          f"{sum(e['bytes'] for e in entries.values()) / 1e6:.1f} MB")
    print(f"CI subset: {len(ci)} documents, "
          f"{sum(entries[s]['pages'] for s in ci)} pages")
    print(f"years    : {sorted({e['year'] for e in entries.values()})}")
    print(f"classes  : {len(covered)}/{len(ALL_CLASSES)} covered")
    for cls in missing:
        print(f"  MISSING {cls}")


if __name__ == "__main__":
    main()
