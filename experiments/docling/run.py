"""Docling over the six benchmark PDFs — CPU only, on purpose.

    cd experiments && uv run python docling/run.py

Same six documents, same page-level output as `mineru/`, so the two can be scored
against the reference with one script. OCR is on (the set contains scans) with
French as the EasyOCR language, and page breaks are kept as
`<!-- pagebreak -->` — Docling can place them, MinerU cannot.
"""

from __future__ import annotations

import json
import pathlib
import time

from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import (
    EasyOcrOptions,
    PdfPipelineOptions,
    TableStructureOptions,
)
from docling.document_converter import DocumentConverter, PdfFormatOption

HERE = pathlib.Path(__file__).resolve().parent
DOCS = HERE.parent / "gold" / "documents"
OUT = HERE / "raw"
PAGE_BREAK = "<!-- pagebreak -->"


def main() -> None:
    OUT.mkdir(exist_ok=True)

    pipeline = PdfPipelineOptions()
    pipeline.do_ocr = True
    pipeline.do_table_structure = True
    pipeline.table_structure_options = TableStructureOptions(do_cell_matching=True)
    pipeline.ocr_options = EasyOcrOptions(lang=["fr"], use_gpu=False)
    pipeline.accelerator_options = AcceleratorOptions(
        num_threads=8, device=AcceleratorDevice.CPU
    )

    converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline)}
    )

    rows = []
    for pdf in sorted(DOCS.glob("*.pdf")):
        start = time.time()
        try:
            result = converter.convert(pdf)
            document = result.document
            markdown = document.export_to_markdown(page_break_placeholder=PAGE_BREAK)
            (OUT / f"{pdf.stem}.md").write_text(markdown, encoding="utf-8")
            (OUT / f"{pdf.stem}.json").write_text(
                json.dumps(document.export_to_dict(), ensure_ascii=False), encoding="utf-8"
            )
            pages = len(getattr(result, "pages", {}) or {})
            elapsed = round(time.time() - start, 1)
            rows.append(
                {
                    "sha": pdf.stem,
                    "ok": True,
                    "pages": pages,
                    "chars": len(markdown),
                    "seconds": elapsed,
                }
            )
            print(
                f"{pdf.stem[:8]}  ok  {len(markdown):>7,} chars  {pages:>3} pages  {elapsed:>7.1f}s",
                flush=True,
            )
        except Exception as exc:
            import traceback

            traceback.print_exc()
            rows.append({"sha": pdf.stem, "ok": False, "error": f"{type(exc).__name__}: {exc}"})
            print(f"{pdf.stem[:8]}  FAILED  {type(exc).__name__}: {exc}", flush=True)

    (OUT / "results.json").write_text(
        json.dumps({"rows": rows}, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    ok = [r for r in rows if r.get("ok")]
    print(
        f"\n{len(ok)}/{len(rows)} documents, {sum(r['chars'] for r in ok):,} chars, "
        f"{sum(r['seconds'] for r in ok):.1f}s",
        flush=True,
    )


if __name__ == "__main__":
    main()
