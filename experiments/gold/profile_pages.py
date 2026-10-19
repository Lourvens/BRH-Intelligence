"""Profile every page of every downloaded PDF, and cache it.

Page-level, because that is the granularity a benchmark and the ingestion router
both work at. Writes /tmp/opencode/pages.json so the selection step is instant.

    uv run python /tmp/opencode/ocr_pages.py
"""

from __future__ import annotations

import json
import pathlib

import pymupdf

from brh_core.config import get_settings
from brh_core.db.pool import open_pool

STORE = pathlib.Path("data/raw/web")
OUT = HERE / "page-profiles.json"


def dominant_dpi(page: pymupdf.Page) -> float | None:
    best_area, best = 0.0, None
    for info in page.get_image_info():
        box = pymupdf.Rect(info["bbox"])
        if not box.width:
            continue
        if box.get_area() > best_area:
            best_area, best = box.get_area(), info["width"] / (box.width / 72)
    return best


def coverage(page: pymupdf.Page) -> float:
    area = abs(page.rect.get_area())
    if not area:
        return 0.0
    covered = sum(abs(pymupdf.Rect(i["bbox"]).get_area()) for i in page.get_image_info())
    return min(covered / area, 1.0)


def multi_column(page: pymupdf.Page) -> bool:
    blocks = [b for b in page.get_text("blocks") if b[4].strip()]
    if len(blocks) < 6:
        return False
    width = page.rect.width
    xs = sorted(b[0] for b in blocks)
    gap, index = max(
        ((xs[i + 1] - xs[i], i) for i in range(len(xs) - 1)), default=(0.0, 0)
    )
    return gap > 0.18 * width and index + 1 >= 3 and len(xs) - index - 1 >= 3


def table_info(page: pymupdf.Page, text: int) -> bool:
    """A real table: >= 2 columns, >= 3 rows, on a page that is mostly prose.

    Without the guards this fires on cover pages and chart grids, which is how a
    designed cover ended up tagged as a table.
    """
    if text < 200:
        return False
    area = abs(page.rect.get_area())
    for table in page.find_tables().tables:
        if table.col_count < 2 or table.row_count < 3:
            continue
        share = abs(pymupdf.Rect(table.bbox).get_area()) / area if area else 1.0
        if share < 0.9:
            return True
    return False


def is_cover(text: int, cover: float) -> bool:
    """A designed page: little prose, mostly artwork."""
    return text < 600 and cover > 0.4


def figure(page: pymupdf.Page) -> bool:
    area = abs(page.rect.get_area())
    if not area:
        return False
    for info in page.get_image_info():
        share = abs(pymupdf.Rect(info["bbox"]).get_area()) / area
        if 0.05 < share < 0.8:
            return True
    return False


def main() -> None:
    settings = get_settings()
    pool = open_pool(settings)
    pool.open()
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT DISTINCT ON (sha256) sha256, title,
                       extract(year FROM wp_date)::int AS year,
                       url
                FROM corpus.crawl_urls WHERE sha256 IS NOT NULL
                ORDER BY sha256, wp_date ASC
                """
            ).fetchall()
    finally:
        pool.close()
    meta = {r["sha256"].strip(): (r["title"] or "", r["year"], r["url"]) for r in rows}

    pages: list[dict] = []
    for done, path in enumerate(sorted(STORE.glob("*.pdf")), start=1):
        title, year, url = meta.get(path.stem, ("", None, ""))
        doc = pymupdf.open(path)
        try:
            count = doc.page_count
            for number, page in enumerate(doc, start=1):
                text = len(page.get_text("text").strip())
                scanned = text < 50
                colours = [str(i["cs-name"]).split("(")[0] for i in page.get_image_info()]
                pages.append(
                    {
                        "sha": path.stem,
                        "page": number,
                        "title": title,
                        "year": year,
                        "url": url,
                        "pages_in_doc": count,
                        "chars": text,
                        "scanned": scanned,
                        "cover": round(coverage(page), 3),
                        "dpi": dominant_dpi(page) if scanned else None,
                        "colours": sorted(set(colours)),
                        "cover": (not scanned) and is_cover(text, coverage(page)),
                        "table": (not scanned) and table_info(page, text),
                        "figure": (not scanned) and figure(page),
                        "columns": (not scanned) and multi_column(page),
                        "drawings": len(page.get_drawings()),
                    }
                )
        finally:
            doc.close()
        print(f"{done:>4} {path.stem[:8]} {count}p", flush=True)

    OUT.write_text(json.dumps(pages, indent=1))
    scanned = sum(1 for p in pages if p["scanned"])
    print()
    print(f"pages profiled : {len(pages)}")
    print(f"without a text layer: {scanned} ({100 * scanned / len(pages):.1f}%)")
    print(f"cover pages         : {sum(1 for p in pages if p['cover'])}")
    print(f"pages with a table  : {sum(1 for p in pages if p['table'])}")
    print(f"pages with a figure : {sum(1 for p in pages if p['figure'])}")
    print(f"two-column pages    : {sum(1 for p in pages if p['columns'])}")


if __name__ == "__main__":
    main()
