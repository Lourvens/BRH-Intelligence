"""Score MinerU against the PDF text layer, beside the LlamaParse reference.

    cd experiments && uv run python mineru/score.py

Reads `raw/<sha256>.json` (MinerU's own page tree) and compares each page to the
PDF's text layer with the same two metrics the reference uses: word F1 (content,
order-insensitive) and WER (order, rewrap-safe). The LlamaParse columns come from
`gold/reference.json`, so the two engines are measured identically.

Table bodies arrive as HTML inside the page tree, so they are stripped of tags
rather than skipped — otherwise every table page scores as if it were empty.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
from collections import Counter

import pymupdf

HERE = pathlib.Path(__file__).resolve().parent
GOLD = HERE.parent / "gold"
RAW = HERE / "raw"

sys.path.insert(0, str(GOLD))
from build_reference import normalise, wer, word_f1  # noqa: E402

WORD = re.compile(r"\w+", re.UNICODE)
TAG = re.compile(r"<[^>]+>")


def page_text(node: object) -> str:
    """Every string under a `content` key, HTML tables included."""
    parts: list[str] = []

    def walk(value: object) -> None:
        if isinstance(value, dict):
            content = value.get("content")
            if isinstance(content, str):
                parts.append(TAG.sub(" ", content))
            for child in value.values():
                if isinstance(child, (dict, list)):
                    walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(node)
    return normalise(" ".join(parts))


def main() -> None:
    record = json.loads((GOLD / "reference.json").read_text())
    rows = []

    for pdf in sorted((GOLD / "documents").glob("*.pdf")):
        sha = pdf.stem
        pages = json.loads((RAW / f"{sha}.json").read_text())["pages"]
        doc = pymupdf.open(pdf)
        layer = {n: doc[n - 1].get_text("text") for n in range(1, doc.page_count + 1)}
        doc.close()

        for page in pages:
            number = page["page_idx"] + 1
            reference = record["documents"][sha]["pages"].get(str(number), {})
            if reference.get("scanned") or not layer.get(number):
                continue
            text = page_text(page)
            rows.append(
                {
                    "doc": sha[:8],
                    "page": number,
                    "class": reference.get("class", "?"),
                    "f1": word_f1(layer[number], text),
                    "wer": wer(layer[number], text),
                    "lp_f1": reference.get("content_f1"),
                    "lp_wer": reference.get("order_wer"),
                }
            )

    print(f"{'doc':<10}{'pg':<4}{'class':<22}{'F1':>7}{'WER':>7}{'LP F1':>7}{'LP WER':>7}")
    for row in sorted(rows, key=lambda r: -r["wer"]):
        lp_f1 = "-" if row["lp_f1"] is None else f"{row['lp_f1']:.3f}"
        lp_wer = "-" if row["lp_wer"] is None else f"{row['lp_wer']:.3f}"
        print(
            f"{row['doc']:<10}{row['page']:<4}{row['class']:<22}"
            f"{row['f1']:>7.3f}{row['wer']:>7.3f}{lp_f1:>7}{lp_wer:>7}"
        )

    both = [r for r in rows if r["lp_f1"] is not None]
    print()
    print(f"pages            {len(rows)}")
    print(f"MinerU     F1 mean {sum(r['f1'] for r in rows) / len(rows):.3f}  "
          f"F1>=0.98 {sum(1 for r in rows if r['f1'] >= 0.98)}  "
          f"WER<=0.10 {sum(1 for r in rows if r['wer'] <= 0.10)}")
    print(f"LlamaParse F1 mean {sum(r['lp_f1'] for r in both) / len(both):.3f}  "
          f"F1>=0.98 {sum(1 for r in both if r['lp_f1'] >= 0.98)}  "
          f"WER<=0.10 {sum(1 for r in both if (r['lp_wer'] or 9) <= 0.10)}")


if __name__ == "__main__":
    main()
