"""Build the evaluation reference with LlamaParse, the baseline OCR.

Reads the chosen PDFs in `documents/` and writes **one markdown file per
document** (not per page), with page markers so pages stay addressable:

    reference/<sha256>.md    the reference: tables as tables, charts as data
    reference/<sha256>.txt   plain text derived from it (no markdown syntax)

    cd experiments && uv run python gold/build_reference.py            # parse + score
    cd experiments && uv run python gold/build_reference.py --recheck  # re-score only
    cd experiments && uv run python gold/build_reference.py --force    # re-parse

The markdown is the reference and the text is derived from it — one source, so
the two can never drift. Scoring is done on the derived text.

Parsing options mirror the sibling project's `llamaparse` skill:

* `specialized_chart_parsing: agentic` — reads a bar/line/pie chart and returns
  its values as a table, so a chart page yields data instead of axis labels.
* `output_tables_as_markdown: true` — pipe tables, not HTML.
* `ocr_parameters.languages: [fr]` — the corpus is French-only (ADR-0004).

`merge_continued_tables` is deliberately **off**: it moves rows onto the first
page of a table, which would break per-page scoring and page-level citations.

Two independent scores, computed against the PDF's own text layer, because
content and order fail separately:

* **content** — word F1, order-insensitive. `verified` at F1 >= 0.98.
* **order** — word error rate over the word sequence, rewrap-safe (a different
  line breaking must not count as an error, which is why this is WER and not
  character CER). `ok` at WER <= 0.10.

Both are *diagnostics*, not verdicts: the markdown is a semantic reconstruction
— it promotes headings, rebuilds tables, describes figures — so a small WER is
expected even on a perfect page. Pages where the markdown is *more* than a
transcription (a chart rebuilt as a data table, a described figure) are marked
`semantic`: their word count far exceeds the text layer's, and scoring them as
transcriptions would punish the better extraction.

Scanned pages have no text layer to check against, so they are `unverified` —
OCR taken on faith, awaiting human transcription.

Requires LLAMA_CLOUD_API_KEY in the environment or in the repo-root `.env`.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import sys
from collections import Counter

import pymupdf

from build_manifest import page_class  # same directory, run as a script

HERE = pathlib.Path(__file__).resolve().parent
DOCUMENTS = HERE / "documents"
PROFILES = HERE / "page-profiles.json"
REFERENCE = HERE / "reference"
RECORD = HERE / "reference.json"

TIER = "agentic"  # the AI tier; 'fast' is rule-based and would undersell the baseline
VERSION = "latest"
LANGUAGES = ["fr"]
OUTPUT_OPTIONS = {
    # Screenshots are regenerable from the committed PDFs, and the chart *data*
    # comes from specialized_chart_parsing — not from saved images.
    "images_to_save": [],
    "markdown": {
        "annotate_links": True,
        "tables": {
            "output_tables_as_markdown": True,
            "compact_markdown_tables": True,
        },
    },
}
PROCESSING_OPTIONS = {
    "ocr_parameters": {"languages": LANGUAGES},
    "specialized_chart_parsing": "agentic",
}

VERIFY_F1 = 0.98  # content: same words
ORDER_WER = 0.10  # order: same sequence, allowing for structural rewrites
SEMANTIC_RATIO = 1.30  # md words / text-layer words above this = not a transcription

MARKER = re.compile(r"^<!-- page (\d+) -->$", re.M)
TABLE_RULE = re.compile(r"^\s*\|?[\s:|-]{4,}\|?\s*$", re.M)
WS = re.compile(r"\s+")
WORD = re.compile(r"\w+", re.UNICODE)


def api_key() -> str:
    key = os.environ.get("LLAMA_CLOUD_API_KEY", "").strip()
    if key:
        return key
    for parent in (HERE, *HERE.parents):
        env = parent / ".env"
        if not env.is_file():
            continue
        for line in env.read_text(encoding="utf-8", errors="replace").splitlines():
            match = re.match(r"\s*LLAMA_CLOUD_API_KEY\s*=\s*['\"]?([^'\"#\s]+)", line)
            if match:
                return match.group(1)
    raise SystemExit(
        "LLAMA_CLOUD_API_KEY is not set. Put it in the repo-root .env, or export it:\n"
        "  echo 'LLAMA_CLOUD_API_KEY=llx-...' >> .env"
    )


def normalise(text: str) -> str:
    """Collapse whitespace — layout is not what this reference measures."""
    return WS.sub(" ", text).strip()


def markdown_to_text(markdown: str) -> str:
    """Strip markdown syntax, keep the words.

    A plain-text engine must not be charged for syntax it was never asked to
    emit, and the reference must be comparable to one.
    """
    text = re.sub(r"^#{1,6}\s*", "", markdown, flags=re.M)  # headings
    text = re.sub(r"^\s*\|?[\s:|-]{4,}\|?\s*$", "", text, flags=re.M)  # table rules
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)  # images
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)  # links
    text = text.replace("|", " ").replace("*", "").replace("`", "")
    text = re.sub(r"\\(.)", r"\1", text)  # escapes
    return WS.sub(" ", text).strip()


def word_f1(reference: str, hypothesis: str) -> float:
    """Bag-of-words F1: did it read the right words, whatever the order?"""
    want = Counter(WORD.findall(reference.lower()))
    got = Counter(WORD.findall(hypothesis.lower()))
    overlap = sum((want & got).values())
    if not want and not got:
        return 1.0
    recall = overlap / sum(want.values()) if want else 0.0
    precision = overlap / sum(got.values()) if got else 0.0
    return 2 * precision * recall / (precision + recall) if precision + recall else 0.0


def wer(reference: str, hypothesis: str) -> float:
    """Word error rate: is the text in the right order?

    Words, not characters, because the markdown rewraps lines and promotes
    headings — a character edit distance would charge it for layout.
    """
    want = WORD.findall(reference.lower())
    got = WORD.findall(hypothesis.lower())
    if not want:
        return 1.0 if got else 0.0
    previous = list(range(len(got) + 1))
    for i, source in enumerate(want, start=1):
        current = [i]
        for j, target in enumerate(got, start=1):
            current.append(
                min(
                    previous[j] + 1,
                    current[j - 1] + 1,
                    previous[j - 1] + (source != target),
                )
            )
        previous = current
    return previous[-1] / len(want)


def write_document(path: pathlib.Path, pages: dict[int, str]) -> None:
    """One file per document, with page markers so pages stay addressable."""
    parts = [
        f"<!-- page {number} -->\n\n{pages[number].strip()}\n"
        for number in sorted(pages)
    ]
    path.write_text("\n".join(parts), encoding="utf-8")


def read_document(path: pathlib.Path) -> dict[int, str]:
    """Split a document file back into pages."""
    if not path.is_file():
        return {}
    text = path.read_text(encoding="utf-8")
    matches = list(MARKER.finditer(text))
    pages = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        pages[int(match.group(1))] = text[match.end() : end].strip()
    return pages


def describe(
    number: int,
    markdown: str,
    profile: dict,
    layer_text: str,
    confidence: float | None,
) -> dict:
    """Score one page on content and reading order, independently."""
    scanned = bool(profile.get("scanned"))
    text = markdown_to_text(markdown)
    layer = normalise(layer_text)
    text_words = len(WORD.findall(text))
    layer_words = len(WORD.findall(layer))
    ratio = round(text_words / layer_words, 2) if layer_words else None

    status, reason, f1, delta = "empty", None, None, None
    has_table = bool(TABLE_RULE.search(markdown))
    if not markdown.strip():
        pass
    elif scanned or not layer:
        # Nothing to check against: OCR taken on faith.
        status = "unverified"
    else:
        f1 = word_f1(layer, text)
        delta = wer(layer, text)
        if ratio is not None and ratio > SEMANTIC_RATIO:
            # A chart rebuilt as a data table, a figure described: richer than
            # a transcription, so not scoreable as one.
            status = "semantic"
            reason = "chart or figure reconstructed as data"
        elif f1 >= VERIFY_F1 and (has_table or delta <= ORDER_WER):
            # A table is verified on content alone: its serialization has no
            # single correct order to be wrong about.
            status = "verified"
        else:
            status = "review"

    # A table has no single reading order: the text layer emits it column-major,
    # the markdown row-major. Same words, different serialization — scoring it
    # as an order error would punish the better one.
    if status in {"verified", "review"} and not has_table:
        order = "ok" if delta <= ORDER_WER else "broken"
    else:
        order = None
    if has_table and status in {"verified", "review"}:
        reason = "table: serialization differs from the text layer"

    return {
        "class": page_class(profile) if profile else "?",
        "scanned": scanned,
        "status": status,
        "reason": reason,
        "reading_order": order,
        "has_table": has_table,
        "chars": len(text),
        "words": text_words,
        "expansion_ratio": ratio,
        "content_f1": None if f1 is None else round(f1, 4),
        "order_wer": None if delta is None else round(delta, 4),
        "confidence": confidence,
    }


def main() -> None:
    force = "--force" in sys.argv
    recheck = "--recheck" in sys.argv

    profiles = json.loads(PROFILES.read_text())
    by_page = {(p["sha"], p["page"]): p for p in profiles}
    pdfs = sorted(DOCUMENTS.glob("*.pdf"))
    if not pdfs:
        raise SystemExit(f"no PDFs in {DOCUMENTS}")

    existing = json.loads(RECORD.read_text()) if RECORD.exists() else {}
    previous = existing.get("documents", {})

    def score_document(sha: str, pdf: pathlib.Path) -> dict | None:
        """Score a document from its markdown — no network, no credits."""
        md_path = REFERENCE / f"{sha}.md"
        if not md_path.is_file():
            return None
        doc = pymupdf.open(pdf)
        layer = {n: page.get_text("text") for n, page in enumerate(doc, start=1)}
        doc.close()

        markdown = read_document(md_path)
        confidence = previous.get(sha, {}).get("confidence_by_page", {})
        pages = {}
        text_pages = {}
        for number, body in sorted(markdown.items()):
            text_pages[number] = markdown_to_text(body)
            pages[str(number)] = describe(
                number,
                body,
                by_page.get((sha, number), {}),
                layer.get(number, ""),
                confidence.get(str(number)),
            )
        write_document(REFERENCE / f"{sha}.txt", text_pages)
        return pages

    if recheck:
        if not previous:
            raise SystemExit("nothing to recheck — run without --recheck first")
        record = {k: v for k, v in existing.items() if k != "documents"}
        record["documents"] = {}
        for pdf in pdfs:
            sha = pdf.stem
            entry = previous.get(sha)
            if not entry or "error" in entry:
                continue
            pages = score_document(sha, pdf)
            if pages is None:
                continue
            entry["pages"] = pages
            record["documents"][sha] = entry
            print(f"{sha[:8]}  re-scored {len(pages)} pages")
    else:
        from llama_cloud import LlamaCloud  # late, so --recheck needs no SDK

        client = LlamaCloud(api_key=api_key())
        REFERENCE.mkdir(exist_ok=True)
        record = {
            "provider": "llamaparse",
            "tier": TIER,
            "version": VERSION,
            "languages": LANGUAGES,
            "output_options": OUTPUT_OPTIONS,
            "processing_options": PROCESSING_OPTIONS,
            "format": {"per": "document", "page_marker": "<!-- page N -->"},
            "verify_word_f1": VERIFY_F1,
            "order_wer_threshold": ORDER_WER,
            "semantic_ratio_threshold": SEMANTIC_RATIO,
            "documents": {},
        }

        for pdf in pdfs:
            sha = pdf.stem
            md_path = REFERENCE / f"{sha}.md"
            if not force and sha in previous and md_path.is_file():
                print(f"{sha[:8]}  cached")
                record["documents"][sha] = previous[sha]
                continue

            doc = pymupdf.open(pdf)
            expected = doc.page_count
            doc.close()

            print(f"{sha[:8]}  parsing {expected} pages …", flush=True)
            try:
                response = client.parsing.parse(
                    upload_file=pdf,
                    tier=TIER,
                    version=VERSION,
                    expand=["markdown", "metadata", "usage"],
                    output_options=OUTPUT_OPTIONS,
                    processing_options=PROCESSING_OPTIONS,
                )
            except Exception as exc:  # one bad document must not lose the batch
                print(f"  FAILED {type(exc).__name__}: {exc}")
                record["documents"][sha] = {"error": f"{type(exc).__name__}: {exc}"}
                RECORD.write_text(json.dumps(record, indent=1, ensure_ascii=False))
                continue

            markdown_pages = {
                p.page_number: getattr(p, "markdown", "") or ""
                for p in (response.markdown.pages or [])
            }
            # page_number is documented only as "page number of the document";
            # this benchmark and the viewer are 1-based, so normalise and record.
            offset = 1 if markdown_pages and min(markdown_pages) == 0 else 0
            markdown_pages = {n + offset: v for n, v in markdown_pages.items()}
            confidence = {
                str(p.page_number + offset): getattr(p, "confidence", None)
                for p in (getattr(response.metadata, "pages", None) or [])
            }

            write_document(md_path, markdown_pages)
            record["documents"][sha] = {
                "title": by_page.get((sha, 1), {}).get("title", ""),
                "pages_expected": expected,
                "pages_returned": len(markdown_pages),
                "page_number_offset_applied": offset,
                "job_id": str(getattr(response.job, "id", "")),
                "credits": getattr(getattr(response.job, "usage", None), "credits", None),
                "file": f"reference/{sha}.md",
                "confidence_by_page": confidence,
                "pages": {},
            }
            previous[sha] = record["documents"][sha]  # so scoring can read confidence
            return_pages = score_document(sha, pdf) or {}
            record["documents"][sha]["pages"] = return_pages
            print(f"  {len(markdown_pages)}/{expected} pages → reference/{sha[:8]}….md")
            RECORD.write_text(json.dumps(record, indent=1, ensure_ascii=False))

    RECORD.write_text(json.dumps(record, indent=1, ensure_ascii=False))

    statuses: dict[str, int] = {}
    orders: dict[str, int] = {}
    chars = credits = 0
    for document in record["documents"].values():
        credits += document.get("credits") or 0
        for page in document.get("pages", {}).values():
            statuses[page["status"]] = statuses.get(page["status"], 0) + 1
            key = page.get("reading_order") or "n/a"
            orders[key] = orders.get(key, 0) + 1
            chars += page["chars"]

    print()
    print(f"documents : {sum(1 for d in record['documents'].values() if 'error' not in d)}")
    print(f"pages     : {sum(statuses.values())}")
    print(f"characters: {chars:,}")
    print(f"credits   : {credits:g}")
    for status, count in sorted(statuses.items()):
        print(f"  content {status:<11} {count}")
    for key, count in sorted(orders.items()):
        print(f"  order   {key:<11} {count}")
    print(f"record    : {RECORD}")


if __name__ == "__main__":
    main()
