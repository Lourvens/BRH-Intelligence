"""OCR engines behind one narrow interface.

The batch runner only needs: parse a PDF, give me the pages. Everything about
torch, vLLM and model families stays in the adapter, which imports the heavy
package lazily — ``import brh_core.ingestion.engines`` must work on a machine
with no OCR stack installed.
"""

from __future__ import annotations

import importlib.metadata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True, slots=True)
class OcrPage:
    """One parsed page."""

    number: int  # 1-based, matching the PDF viewer
    markdown: str
    source_dir: Path  # where this page's figures were written (``imgs/`` lives here)


@dataclass(frozen=True, slots=True)
class OcrDocument:
    """What an engine returns for one file."""

    pages: list[OcrPage]
    engine: str
    engine_version: str


class Engine(Protocol):
    """What the batch runner expects from an OCR engine."""

    name: str

    def version(self) -> str: ...

    def parse(self, pdf: Path, workdir: Path) -> OcrDocument: ...


def _installed(package: str) -> str:
    try:
        return importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:
        return "unknown"


@dataclass(slots=True)
class PaddleOcrVlEngine:
    """PaddleOCR-VL (0.9B) through the ``transformers`` engine.

    ``transformers`` runs layout and VLM on torch, so it needs no Paddle GPU
    wheel and no vLLM — the same configuration the benchmark selected. Chart
    recognition is on: without it a chart comes back as a picture with its axis
    labels, with it you get the plotted series as a table.
    """

    device: str | None = None
    chart_recognition: bool = True
    backend: str = "transformers"
    # Backend knobs, passed straight through as PaddleOCR's `engine_config`.
    # Measured on a T4 (3 pages, real document), every override loses:
    #   default bf16   14.7 s/page
    #   float32        44.1 s/page  (3x slower)
    #   bf16 explicit  fails: "cv worker: Got unsupported ScalarType BFloat16"
    #   sdpa           fails: HGNetV2Backbone does not support it
    #   max_pixels     14.8 s/page at both 640 and 480 — no measurable effect
    # So this stays None unless a future engine version changes the picture.
    engine_config: dict[str, object] | None = None
    name: str = field(default="paddleocr-vl", init=False)
    _pipeline: object | None = field(default=None, init=False, repr=False)

    def version(self) -> str:
        return _installed("paddleocr")

    def _build(self) -> object:
        from paddleocr import PaddleOCRVL  # heavy: only when a batch actually runs

        options: dict[str, object] = {
            "engine": self.backend,
            "use_chart_recognition": self.chart_recognition,
        }
        if self.device:
            options["device"] = self.device
        if self.engine_config:
            options["engine_config"] = self.engine_config
        return PaddleOCRVL(**options)

    def parse(self, pdf: Path, workdir: Path) -> OcrDocument:
        if self._pipeline is None:
            self._pipeline = self._build()  # reused across a batch: model load is the slow part

        results = list(self._pipeline.predict(str(pdf)))  # type: ignore[attr-defined]

        pages: list[OcrPage] = []
        for number, result in enumerate(results, start=1):
            directory = workdir / "pages" / f"p{number:03d}"
            directory.mkdir(parents=True, exist_ok=True)
            result.save_to_markdown(save_path=str(directory))
            written = sorted(directory.glob("*.md"))
            pages.append(
                OcrPage(
                    number=number,
                    markdown=written[0].read_text(encoding="utf-8") if written else "",
                    source_dir=directory,
                )
            )

        return OcrDocument(pages=pages, engine=self.name, engine_version=self.version())
