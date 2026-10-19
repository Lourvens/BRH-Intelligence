"""Shortlist whole documents as candidates for the benchmark.

This is the machine pass: it proposes a cover of every class, from which a human
picks the evaluation set (see build_manifest.py). It writes `candidates.json` and
copies nothing.

Selection is by document, not by page: a benchmark entry is a file, and every
page of it is in scope, so cost is pages (transcription).

    uv run python experiments/gold/select_documents.py
"""

from __future__ import annotations

import json
import pathlib
from collections import defaultdict

HERE = pathlib.Path(__file__).resolve().parent
STORE = pathlib.Path("data/raw/web")
PAGES = HERE / "page-profiles.json"
CANDIDATES = HERE / "candidates.json"

# Scans decide which engine wins, so each scan class gets several documents.
# The born-digital classes are the harness's control and only need a couple, and
# several of them are one page long and a few kilobytes.
TARGET = {
    "blank": 2,
    "scan/bad": 3,
    "scan/ok": 3,
    "scan/good": 2,
    "digital/text-only": 1,
    "digital/table": 1,
    "digital/2col": 2,
    "digital/cover": 2,
    "digital/figure": 2,
    "digital/table+2col": 2,
    "digital/table+figure": 2,
    "digital/figure+2col": 2,
    "digital/table+figure+2col": 2,
}

# The CI gate needs to be fast, so it is a handful of documents, not the set.
CI_CLASSES = ("scan/bad", "scan/ok", "digital/text-only", "digital/table")
CI_MAX_DOCUMENTS = 8

# A document above either of these is only chosen when nothing smaller covers
# the class — this is what keeps the repo and the transcription bill sane.
PAGE_SOFT_CAP = 12
BYTE_SOFT_CAP = 1_500_000


def dpi_bucket(dpi):
    if dpi is None:
        return "blank"
    return "bad" if dpi < 150 else "ok" if dpi < 250 else "good"


def page_class(page: dict) -> str:
    if page["scanned"]:
        return f"scan/{dpi_bucket(page['dpi'])}" if page["colours"] else "blank"
    if page.get("cover"):
        return "digital/cover"
    tags = [
        name
        for name, on in (("table", page["table"]), ("figure", page["figure"]), ("2col", page["columns"]))
        if on
    ]
    return "digital/" + ("+".join(tags) if tags else "text-only")


def load_documents() -> dict[str, dict]:
    documents: dict[str, dict] = {}
    for page in json.loads(PAGES.read_text()):
        doc = documents.setdefault(
            page["sha"],
            {
                "sha256": page["sha"],
                "title": page["title"],
                "year": page["year"],
                "url": page["url"],
                "pages": page["pages_in_doc"],
                "classes": defaultdict(int),
            },
        )
        doc["classes"][page_class(page)] += 1
    for doc in documents.values():
        path = STORE / f"{doc['sha256']}.pdf"
        doc["bytes"] = path.stat().st_size
        doc["classes"] = dict(doc["classes"])
    return documents


def cheap_first(doc: dict) -> tuple:
    """Sort key: inside the soft caps first, then fewest pages, then fewest bytes."""
    over = doc["pages"] > PAGE_SOFT_CAP or doc["bytes"] > BYTE_SOFT_CAP
    return (over, doc["pages"], doc["bytes"])


def main() -> None:
    documents = load_documents()

    # Weighted greedy cover: at each step take the document that covers the most
    # still-needed classes per page. Sorting by breadth first instead pulls in
    # 56-page reports that happen to touch eight classes, which is how a 14-file
    # set reached 424 pages.
    needed = dict(TARGET)
    selected: dict[str, dict] = {}

    # Two passes. First only documents inside the soft caps, so a class is
    # normally covered by something small; then everything, for the handful of
    # classes (digital/table+figure+2col) that exist only in long documents.
    # Cost is ignored by the score itself, which is why the caps have to be a
    # pool filter rather than a tie-break.
    capped = [
        doc
        for doc in documents.values()
        if doc["pages"] <= PAGE_SOFT_CAP and doc["bytes"] <= BYTE_SOFT_CAP
    ]
    # Years are a coverage goal too, not a tie-break: an exact score tie almost
    # never happens, so a year can fall out of the set without anyone noticing.
    needed["cover"] = 0
    needed.update({f"year:{year}": 1 for year in {d["year"] for d in documents.values()} if year})

    def covered(doc: dict) -> set[str]:
        return set(doc["classes"]) | {f"year:{doc['year']}"}

    for pool in (capped, list(documents.values())):
        while any(count > 0 for count in needed.values()):
            years = {doc["year"] for doc in selected.values()}

            def rank(doc: dict) -> tuple:
                gain = sum(
                    1 for cls, count in needed.items() if count > 0 and cls in covered(doc)
                )
                return (
                    gain / doc["pages"],          # coverage bought per page transcribed
                    1 if doc["year"] not in years else 0,
                    -doc["pages"],
                    -doc["bytes"],
                )

            candidates = [
                doc for doc in pool if doc["sha256"] not in selected and rank(doc)[0] > 0
            ]
            if not candidates:
                break
            best = max(candidates, key=rank)
            selected[best["sha256"]] = best
            for cls in covered(best):
                if needed.get(cls, 0) > 0:
                    needed[cls] -= 1

    # the CI subset: fewest documents that still cover the classes that gate
    ci: list[dict] = []
    remaining = set(CI_CLASSES)
    pool = list(selected.values())
    while remaining and len(ci) < CI_MAX_DOCUMENTS:
        best = max(
            pool,
            key=lambda doc: (
                len(remaining & set(doc["classes"])),
                -len(doc["classes"]),
                *cheap_first(doc),
            ),
        )
        gained = remaining & set(best["classes"])
        if not gained:
            break
        remaining -= gained
        ci.append(best)
        pool.remove(best)

    entries = {
        sha: {
            "sha256": sha,
            "title": doc["title"],
            "year": doc["year"],
            "url": doc["url"],
            "pages": doc["pages"],
            "bytes": doc["bytes"],
            "classes": sorted(doc["classes"]),
            "pages_per_class": doc["classes"],
        }
        for sha, doc in sorted(selected.items())
    }
    ci_shas = sorted(doc["sha256"] for doc in ci)

    total_pages = sum(doc["pages"] for doc in selected.values())
    total_bytes = sum(doc["bytes"] for doc in selected.values())

    print(f"{'class':<28}{'target':>7}{'in set':>8}{'pages avail':>13}")
    print("-" * 56)
    for cls, target in TARGET.items():
        in_set = sum(1 for doc in selected.values() if cls in doc["classes"])
        avail = sum(doc["classes"].get(cls, 0) for doc in documents.values())
        flag = "" if in_set >= min(target, sum(1 for d in documents.values() if cls in d["classes"])) else "  <-- short"
        print(f"{cls:<28}{target:>7}{in_set:>8}{avail:>13}{flag}")

    print()
    print(f"eval set   : {len(selected)} documents, {total_pages} pages, "
          f"{total_bytes / 1e6:.1f} MB")
    print(f"CI subset  : {len(ci)} documents, "
          f"{sum(d['pages'] for d in ci)} pages, "
          f"{sum(d['bytes'] for d in ci) / 1e6:.1f} MB")
    print(f"CI covers  : {sorted(set(CI_CLASSES) - remaining)}"
          + (f"  missing {sorted(remaining)}" if remaining else "  (all core classes)"))
    print(f"years      : {sorted({d['year'] for d in selected.values()})}")
    print(f"largest doc: {max(d['pages'] for d in selected.values())} pages, "
          f"{max(d['bytes'] for d in selected.values()) / 1e6:.1f} MB")

    manifest = {
        "selection": {
            "generated": "2026-10-16",
            "unit": "document",
            "axis": "format x resolution x content, per page; a document joins the "
                    "set for the classes it contains",
            "target_per_class": TARGET,
            "corpus_documents_profiled": len(documents),
            "corpus_pages_profiled": sum(d["pages"] for d in documents.values()),
            "source_sample": "the 116-document stratified sample (--sample 90)",
        },
        "eval": entries,
        "ci": {sha: entries[sha] for sha in ci_shas},
    }
    CANDIDATES.write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    print(f"\nwrote {CANDIDATES} — {len(selected)} candidate documents")


if __name__ == "__main__":
    main()
