"""Build and optionally upload the deterministic BRH chunking dataset.

The dataset contains page-level needles, not model-generated answers. Each
example lets a LangChain target apply a chunker to the same OCR page and score
containment, page provenance, tightness and token-budget compliance. The
sampling is seeded and stratified so a new chunker is compared on identical
content.

Offline artifact::

    uv run --project experiments python experiments/chunking/build_langsmith_dataset.py

Upload (requires a valid LangSmith API key)::

    uv run --project experiments python experiments/chunking/build_langsmith_dataset.py --upload
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import random
import re
from dataclasses import dataclass
from pathlib import Path

from langchain_core.documents import Document

PAGE_MARKER = re.compile(r"^<!-- page (\d+) -->$", re.MULTILINE)
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
TABLE = re.compile(r"(?:^\s*\|.*(?:\n|$))+|<table\b.*?</table>", re.I | re.M | re.S)
HTML_ROW = re.compile(r"<tr\b[^>]*>.*?</tr>", re.I | re.S)
HTML_CELL = re.compile(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", re.I | re.S)
PERIOD_LABEL = re.compile(
    r"(?:trimestre|janv|f[ée]vr|mars|avril|mai|juin|juil|ao[uû]t|sept|oct|nov|d[ée]c)",
    re.I,
)
REGULATORY = re.compile(r"\b(circulaire|avis|loi|décret|règlement|instruction)\b", re.I)
WORD = re.compile(r"[0-9A-Za-zÀ-ÿ%°]{3,}")
STOPWORDS = frozenset(
    [
        "le", "la", "les", "un", "une", "des", "du", "de", "d", "au", "aux", "à", "et",
        "ou", "mais", "donc", "ni", "car", "que", "qui", "dont", "ce", "cet", "cette", "ces",
        "son", "sa", "ses", "leur", "leurs", "il", "elle", "ils", "elles", "nous", "vous",
        "se", "ne", "pas", "plus", "moins", "très", "sur", "sous", "dans", "par", "pour",
        "avec", "sans", "entre", "comme", "aussi", "ainsi", "tout", "tous", "toute", "toutes",
        "même", "si", "non", "est", "sont", "être", "avoir", "a", "ont", "été", "était",
    ]
)

ROOT = next(path for path in (Path.cwd(), *Path.cwd().parents) if (path / "data" / "ocr").is_dir())
OCR_DIR = ROOT / "data" / "ocr"
SEEDS = (20261023, 7, 42)
DATASET_NAME = "brh-chunking-eval-v3"
PROJECT_NAME = "brh-intelligence"
OUTPUT = ROOT / "experiments" / "chunking" / f"{DATASET_NAME}.jsonl"


@dataclass(frozen=True, slots=True)
class Page:
    document_id: str
    page_number: int
    text: str

    @property
    def has_table(self) -> bool:
        return bool(TABLE.search(self.text))

    @property
    def family(self) -> str:
        lead = self.text[:1200]
        if REGULATORY.search(lead) and re.search(r"(?:^|\n)\s*(?:[a-z]\)|\d+[.)])", self.text):
            return "provision"
        if self.has_table:
            return "table"
        return "prose"


def load_pages() -> list[Page]:
    pages: list[Page] = []
    for document in sorted(OCR_DIR.glob("*/document.md")):
        text = document.read_text(encoding="utf-8", errors="replace")
        markers = list(PAGE_MARKER.finditer(text))
        for index, marker in enumerate(markers):
            end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
            body = text[marker.end() : end].strip()
            if len(body) >= 160:
                langchain_document = Document(
                    page_content=body,
                    metadata={
                        "document_id": document.parent.name,
                        "page_number": int(marker.group(1)),
                    },
                )
                pages.append(
                    Page(
                        langchain_document.metadata["document_id"],
                        langchain_document.metadata["page_number"],
                        langchain_document.page_content,
                    )
                )
    return pages


def _strata(pages: list[Page]) -> dict[tuple[str, int], list[Page]]:
    lengths = sorted(len(page.text) for page in pages)
    strata: dict[tuple[str, int], list[Page]] = {}
    for page in pages:
        rank = sum(length <= len(page.text) for length in lengths) / len(lengths)
        bucket = min(int(rank * 3), 2)
        strata.setdefault((page.family, bucket), []).append(page)
    return strata


def _table_needle(page: Page) -> tuple[str, str] | None:
    """Select a retrievable table row, not an impossible whole-table prefix."""
    html_rows = HTML_ROW.findall(page.text)
    if html_rows:
        rows = [
            [html.unescape(re.sub(r"<[^>]+>", "", cell)).strip() for cell in HTML_CELL.findall(row)]
            for row in html_rows
        ]
        data_rows = [row for row in rows if row and not _is_period_header(row)]
        if data_rows:
            row = max(data_rows, key=len)
            labels = _html_header_labels(rows)
            values = []
            for index, value in enumerate(row[:4]):
                if value:
                    label = labels[index] if index < len(labels) else f"colonne {index + 1}"
                    values.append(f"{label}: {value}")
            if values:
                return "Ligne — " + " ; ".join(values), "table-row-semantic"
    lines = [line.strip() for line in page.text.splitlines()]
    before_separator: list[str] = []
    after_separator: list[str] = []
    in_table = False
    saw_separator = False
    for line in lines:
        if not line.startswith("|"):
            if in_table:
                break
            continue
        in_table = True
        if "---" in line:
            saw_separator = True
            continue
        if saw_separator:
            after_separator.append(_canonical_gfm_row(line))
        else:
            before_separator.append(_canonical_gfm_row(line))
    gfm_rows = after_separator if saw_separator else before_separator
    rows = html_rows or gfm_rows
    if not rows:
        return None
    candidates = sorted(rows, key=len, reverse=True)
    needle = candidates[0].strip()
    if len(needle) < 80 and len(candidates) > 1:
        needle = f"{needle}\n{candidates[1].strip()}"
    if len(needle) > 420:
        cut = needle.rfind(" ", 180, 420)
        needle = needle[: cut if cut > 0 else 420]
    return needle, "table-row"


def _canonical_gfm_row(line: str) -> str:
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    cells = [cell.strip() for cell in re.split(r"(?<!\\)\|", stripped)]
    return "| " + " | ".join(cells) + " |"


def _is_period_header(row: list[str]) -> bool:
    cells = [cell for cell in row[1:] if cell]
    return (
        len(cells) >= 2
        and sum(bool(PERIOD_LABEL.search(cell)) for cell in cells) / len(cells) >= 0.5
    )


def _html_header_labels(rows: list[list[str]]) -> list[str]:
    headers = [row for row in rows[:3] if _is_period_header(row)]
    if not headers:
        return []
    width = max(len(row) for row in headers)
    return [
        " / ".join(dict.fromkeys(row[index] for row in headers if index < len(row) and row[index]))
        or f"colonne {index + 1}"
        for index in range(width)
    ]


def _needle(page: Page) -> tuple[str, str] | None:
    if page.has_table:
        table_needle = _table_needle(page)
        if table_needle:
            return table_needle
    pieces = [piece.strip() for piece in SENTENCE_END.split(page.text) if piece.strip()]
    for index in range(len(pieces)):
        candidate = " ".join(pieces[index : index + 3])
        if 150 <= len(candidate) <= 400:
            return candidate, "prose-span"
    if len(page.text) < 180:
        return None
    candidate = page.text[: min(350, len(page.text))]
    return (candidate[: candidate.rfind(" ")].strip() or candidate), "prose-prefix"


def _keywords(text: str, *, limit: int = 8) -> str:
    words: list[str] = []
    seen: set[str] = set()
    for token in WORD.findall(text.lower()):
        if token in STOPWORDS or token in seen:
            continue
        seen.add(token)
        words.append(token)
        if len(words) == limit:
            break
    return " ".join(words)


def _example(page: Page, needle: str, needle_kind: str, seed: int) -> dict[str, object]:
    example_key = f"{page.document_id}:{page.page_number}:{seed}:{needle_kind}:{needle}"
    example_id = hashlib.sha256(example_key.encode()).hexdigest()[:16]
    return {
        "id": example_id,
        "inputs": {
            "document_id": page.document_id,
            "page_number": page.page_number,
            "page_text": page.text,
            "needle": needle,
            "keywords": _keywords(needle),
            "content_family": page.family,
            "needle_kind": needle_kind,
        },
        "outputs": {
            "document_id": page.document_id,
            "page_number": page.page_number,
            "needle": needle,
        },
        "metadata": {
            "seed": seed,
            "content_family": page.family,
            "source": "data/ocr",
            "sampling": "family x length-tercile, table-row-aware",
        },
    }


def build_examples(*, per_stratum: int) -> list[dict[str, object]]:
    pages = load_pages()
    strata = _strata(pages)
    examples: list[dict[str, object]] = []
    for seed in SEEDS:
        rng = random.Random(seed)
        for key in sorted(strata):
            candidates = list(strata[key])
            rng.shuffle(candidates)
            for page in candidates[:per_stratum]:
                selected = _needle(page)
                if selected:
                    needle, needle_kind = selected
                    examples.append(_example(page, needle, needle_kind, seed))
    return examples


def write_jsonl(examples: list[dict[str, object]]) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "".join(json.dumps(example, ensure_ascii=False) + "\n" for example in examples),
        encoding="utf-8",
    )


def upload(examples: list[dict[str, object]]) -> None:
    from dotenv import load_dotenv
    from langsmith import Client

    load_dotenv(ROOT / ".env")
    os.environ.setdefault("LANGSMITH_API_KEY", os.environ.get("LANGCHAIN_API_KEY", ""))
    client = Client()
    client.create_project(
        PROJECT_NAME,
        description="BRH Intelligence chunking and RAG evaluation project",
        metadata={"domain": "brh", "purpose": "chunking-evaluation", "language": "fr"},
        upsert=True,
    )
    dataset = client.create_dataset(
        DATASET_NAME,
        description="Deterministic page-level needles for BRH hybrid chunker evaluation",
        metadata={"seeds": list(SEEDS), "source": "data/ocr", "version": "v3"},
    )
    client.create_examples(
        dataset_id=dataset.id,
        examples=[
            {
                "inputs": example["inputs"],
                "outputs": example["outputs"],
                "metadata": example["metadata"],
            }
            for example in examples
        ],
    )
    print(
        json.dumps(
            {"project": PROJECT_NAME, "dataset": DATASET_NAME, "dataset_id": str(dataset.id)}
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-stratum", type=int, default=12)
    parser.add_argument("--upload", action="store_true")
    args = parser.parse_args()
    examples = build_examples(per_stratum=args.per_stratum)
    write_jsonl(examples)
    print(json.dumps({"examples": len(examples), "output": str(OUTPUT.relative_to(ROOT))}))
    if args.upload:
        upload(examples)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
