"""Evaluate the structure-aware chunker on the LangSmith needle dataset.

The target is deterministic and offline with respect to models: it chunks one
OCR page at a time. LangSmith stores the target outputs and evaluator scores so
future chunking versions can be compared as experiments against the same
dataset.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

from brh_core.ingestion.chunk import chunk_pages
from brh_core.ingestion.chunking.tokens import DEFAULT_MAX_TOKENS
from brh_core.ingestion.extract import ExtractedPage

DATASET_NAME = "brh-chunking-eval-v3"
EXPERIMENT_PREFIX = "structure-v2, table-aware-v3"
TOKEN_LIMIT = DEFAULT_MAX_TOKENS
WORD = re.compile(r"[0-9A-Za-zÀ-ÿ%°]{2,}")


def _normalise(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    return " ".join(value.split())


def target(inputs: dict[str, Any]) -> dict[str, Any]:
    """Chunk the dataset's page with the production hybrid strategy."""
    document_id = str(inputs["document_id"])
    page_number = int(inputs["page_number"])
    page = ExtractedPage(page_number=page_number, text=str(inputs["page_text"]))
    chunks = chunk_pages(document_id, [page], max_tokens=TOKEN_LIMIT)
    return {
        "chunks": [
            {
                "text": chunk.text,
                "page_number": chunk.page_number,
                "page_end": chunk.page_end,
                "token_count": chunk.token_count,
                "chunk_type": str(chunk.chunk_type),
                "metadata": chunk.metadata,
            }
            for chunk in chunks
        ],
        "chunk_count": len(chunks),
    }


def _matching_chunks(inputs: dict[str, Any], outputs: dict[str, Any]) -> list[dict[str, Any]]:
    needle = _normalise(str(inputs["needle"]))
    return [
        chunk
        for chunk in outputs.get("chunks", [])
        if needle in _normalise(str(chunk.get("text", "")))
    ]


def needle_recall(inputs: dict[str, Any], outputs: dict[str, Any]) -> dict[str, Any]:
    matches = _matching_chunks(inputs, outputs)
    return {
        "key": "needle_recall",
        "score": float(bool(matches)),
        "comment": f"{len(matches)} chunk(s) contain the complete needle",
    }


def windowed_needle_recall(inputs: dict[str, Any], outputs: dict[str, Any]) -> dict[str, Any]:
    """Check preservation when adjacent chunks are reconstructed as a window."""
    needle = _normalise(str(inputs["needle"]))
    joined = _normalise(
        "\n".join(str(chunk.get("text", "")) for chunk in outputs.get("chunks", []))
    )
    preserved = needle in joined
    return {
        "key": "windowed_needle_recall",
        "score": float(preserved),
        "comment": (
            "needle survives across chunk boundaries" if preserved else "needle text was lost"
        ),
    }


def provenance(inputs: dict[str, Any], outputs: dict[str, Any]) -> dict[str, Any]:
    expected_page = int(inputs["page_number"])
    chunks = outputs.get("chunks", [])
    valid = all(
        int(chunk["page_number"])
        <= expected_page
        <= int(chunk.get("page_end") or chunk["page_number"])
        for chunk in chunks
    )
    return {
        "key": "page_provenance",
        "score": float(bool(chunks) and valid),
        "comment": (
            "all chunks retain the evaluated page provenance"
            if valid
            else "page provenance mismatch"
        ),
    }


def token_cap(inputs: dict[str, Any], outputs: dict[str, Any]) -> dict[str, Any]:
    counts = [int(chunk.get("token_count") or 0) for chunk in outputs.get("chunks", [])]
    maximum = max(counts, default=0)
    return {
        "key": "token_cap",
        "score": float(maximum <= TOKEN_LIMIT),
        "comment": f"max estimated tokens={maximum}, limit={TOKEN_LIMIT}",
    }


def keyword_cohesion(inputs: dict[str, Any], outputs: dict[str, Any]) -> dict[str, Any]:
    """Measure whether the needle's distinctive terms survive in one passage."""
    keywords = [
        _normalise(token)
        for token in WORD.findall(str(inputs.get("keywords", "")))
    ]
    matches = _matching_chunks(inputs, outputs)
    if not keywords:
        score = 1.0
    elif matches:
        text = _normalise(str(matches[0]["text"]))
        score = sum(keyword in text for keyword in keywords) / len(keywords)
    else:
        score = 0.0
    return {
        "key": "keyword_cohesion",
        "score": score,
        "comment": f"{score:.3f} distinctive-keyword coverage in a needle-containing chunk",
    }


def _load_dotenv(root: Path) -> None:
    from dotenv import load_dotenv

    load_dotenv(root / ".env", override=True)
    if not __import__("os").environ.get("LANGSMITH_API_KEY"):
        __import__("os").environ["LANGSMITH_API_KEY"] = __import__("os").environ.get(
            "LANGCHAIN_API_KEY", ""
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=DATASET_NAME)
    parser.add_argument("--max-concurrency", type=int, default=4)
    args = parser.parse_args()

    root = next(
        path for path in (Path.cwd(), *Path.cwd().parents) if (path / "data" / "ocr").is_dir()
    )
    _load_dotenv(root)
    from langsmith import Client

    client = Client()
    results = client.evaluate(
        target,
        data=args.dataset,
        evaluators=[needle_recall, windowed_needle_recall, provenance, token_cap, keyword_cohesion],
        experiment_prefix=EXPERIMENT_PREFIX,
        description="Deterministic evaluation of BRH structure-aware hybrid chunking v2",
        max_concurrency=args.max_concurrency,
        metadata={"chunker": "structure-v2", "token_limit": TOKEN_LIMIT},
    )
    frame = results.to_pandas()
    summary: dict[str, float] = {}
    for key in (
        "needle_recall",
        "windowed_needle_recall",
        "page_provenance",
        "token_cap",
        "keyword_cohesion",
    ):
        column = f"feedback.{key}"
        if column in frame:
            summary[key] = float(frame[column].mean())
    print(json.dumps({"experiment": str(results), "examples": len(frame), "scores": summary}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
