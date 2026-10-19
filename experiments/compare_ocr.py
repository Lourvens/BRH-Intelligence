"""Every OCR candidate on the same eighteen born-digital pages.

    cd experiments && uv run python compare_ocr.py

LlamaParse numbers come from `gold/reference.json`; the others are re-derived
from their own output, against the PDF text layer, with the same two metrics.
Pages with no text layer (the scans) are excluded — there is nothing independent
to compare them to, which is exactly why they are `unverified`.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

import pymupdf

HERE = pathlib.Path(__file__).resolve().parent
GOLD = HERE / "gold"
MINERU = HERE / "mineru" / "raw"
DOCLING = HERE / "docling" / "raw"
PADDLE = HERE / "paddleocr" / "raw"

sys.path.insert(0, str(GOLD))
sys.path.insert(0, str(HERE / "mineru"))
from build_reference import markdown_to_text, wer, word_f1  # noqa: E402
from score import page_text  # noqa: E402

PAGE_BREAK = "<!-- pagebreak -->"
TAG = re.compile(r"<[^>]+>")
SCAN_SHA = "f2d799b9527eef9caaede5f0c5ee0afe4eb897ff8de972560f7b6e47e58faef9"


def markdown_pages(directory: pathlib.Path, sha: str) -> dict[int, str]:
    """Split a Docling/PaddleOCR markdown document back into pages.

    PaddleOCR emits HTML tables with inline styles, so tags go before the
    markdown cleanup — otherwise `style='word-wrap: break-word'` counts as words.
    """
    path = directory / f"{sha}.md"
    if not path.is_file():
        return {}
    parts = path.read_text(encoding="utf-8").split(PAGE_BREAK)
    return {n: markdown_to_text(TAG.sub(" ", part)) for n, part in enumerate(parts, start=1)}


def mineru_pages(sha: str) -> dict[int, str]:
    path = MINERU / f"{sha}.json"
    if not path.is_file():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {page["page_idx"] + 1: page_text(page) for page in payload["pages"]}


ENGINES = (
    ("LP", None),  # LlamaParse, from reference.json
    ("MU", mineru_pages),
    ("DC", lambda sha: markdown_pages(DOCLING, sha)),
    ("PP", lambda sha: markdown_pages(PADDLE, sha)),
)


def main() -> None:
    reference = json.loads((GOLD / "reference.json").read_text())
    rows = []

    for pdf in sorted((GOLD / "documents").glob("*.pdf")):
        sha = pdf.stem
        texts = {
            name: (None if loader is None else loader(sha)) for name, loader in ENGINES
        }

        doc = pymupdf.open(pdf)
        layer = {n: doc[n - 1].get_text("text") for n in range(1, doc.page_count + 1)}
        doc.close()

        for number, text in layer.items():
            page = reference["documents"][sha]["pages"].get(str(number), {})
            if page.get("scanned") or not text:
                continue

            scores = {}
            for name, _ in ENGINES:
                if name == "LP":
                    scores[name] = (page.get("content_f1"), page.get("order_wer"))
                elif texts[name] and number in texts[name]:
                    scores[name] = (
                        word_f1(text, texts[name][number]),
                        wer(text, texts[name][number]),
                    )
            rows.append({"doc": sha[:8], "page": number, "class": page.get("class", "?"), "scores": scores})

    header = f"{'doc':<10}{'pg':<4}{'class':<22}" + "".join(f"{n + ' F1':>7}" for n, _ in ENGINES) + " |" + "".join(f"{n + ' W':>7}" for n, _ in ENGINES)
    print(header)
    for row in sorted(rows, key=lambda r: (r["doc"], r["page"])):
        line = f"{row['doc']:<10}{row['page']:<4}{row['class']:<22}"
        for name, _ in ENGINES:
            value = row["scores"].get(name)
            line += f"{'-' if value is None or value[0] is None else f'{value[0]:.3f}':>7}"
        line += " |"
        for name, _ in ENGINES:
            value = row["scores"].get(name)
            line += f"{'-' if value is None or value[1] is None else f'{value[1]:.3f}':>7}"
        print(line)

    print()
    print(f"pages {len(rows)}")
    for name, _ in ENGINES:
        values = [r["scores"][name] for r in rows if name in r["scores"] and r["scores"][name][0] is not None]
        if not values:
            print(f"{name:<11} (no output)")
            continue
        mean_f1 = sum(v[0] for v in values) / len(values)
        print(
            f"{name:<11} mean F1 {mean_f1:.3f}  F1>=0.98 {sum(1 for v in values if v[0] >= 0.98):>2}/{len(values)}"
            f"  WER<=0.10 {sum(1 for v in values if v[1] <= 0.10):>2}/{len(values)}"
        )

    print()
    print("scanned circular f2d799b9, page 1 — first 200 chars per engine")
    print("(no text layer, so no F1; this is the human read)")
    ref_text = GOLD / "reference" / f"{SCAN_SHA}.txt"
    ref_p1 = ""
    if ref_text.is_file():
        ref_p1 = ref_text.read_text(encoding="utf-8").split("<!-- page 2 -->")[0]
        ref_p1 = re.sub(r"^<!-- page \d+ -->", "", ref_p1)

    sources = [
        ("LlamaParse", ref_p1),
        ("MinerU", mineru_pages(SCAN_SHA).get(1, "")),
        ("Docling", markdown_pages(DOCLING, SCAN_SHA).get(1, "")),
        ("PaddleOCR", markdown_pages(PADDLE, SCAN_SHA).get(1, "")),
    ]
    for name, text in sources:
        flat = re.sub(r"\s+", " ", re.sub(r"<!--.*?-->", " ", text)).strip()
        print(f"  {name:<10} no.95-1A {'yes' if '95-1A' in flat else 'NO '} | {flat[:200]}")


if __name__ == "__main__":
    main()
