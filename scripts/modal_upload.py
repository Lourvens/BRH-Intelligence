"""Stage and inspect the corpus volume — no GPU functions, so it runs before billing is set up.

An app that declares a GPU Function is rejected at creation when the workspace
has no payment method, so staging and inspection live here rather than in
``modal_ocr.py``.

    modal run scripts/modal_upload.py                 # upload pdfs, outputs, manifest
    modal run scripts/modal_upload.py::plan           # what still needs OCR
    modal run scripts/modal_upload.py::status         # what is in the volume
"""

from __future__ import annotations

import json
from pathlib import Path

import modal

ROOT = Path(__file__).resolve().parent.parent
OCR = ROOT / "data" / "ocr"
PDFS = ROOT / "data" / "raw" / "web"

app = modal.App("brh-ocr-upload")
volume = modal.Volume.from_name("brh-ocr", create_if_missing=True)


def _manifest() -> list[str]:
    path = OCR / "manifest.jsonl"
    if not path.is_file():
        return []
    return [json.loads(line)["sha256"] for line in path.read_text().splitlines() if line.strip()]


def _present() -> set[str]:
    return {entry.path.rsplit("/", 1)[-1] for entry in volume.listdir("/ocr", recursive=False)}


def _remaining() -> list[str]:
    present = _present()
    return [sha for sha in _manifest() if sha not in present]


@app.local_entrypoint()
def main(force: bool = False) -> None:
    pdfs = sorted(PDFS.glob("*.pdf"))
    documents = sorted(path for path in OCR.iterdir() if path.is_dir() and path.name != "_ledger")
    with volume.batch_upload(force=force) as batch:
        for pdf in pdfs:
            batch.put_file(str(pdf), f"/pdfs/{pdf.stem}.pdf")
        for document in documents:
            batch.put_directory(str(document), f"/ocr/{document.name}")
        manifest = OCR / "manifest.jsonl"
        if manifest.is_file():
            batch.put_file(str(manifest), "/manifest.jsonl")
    print(f"uploaded {len(pdfs)} pdfs, {len(documents)} existing documents, manifest")
    print("pdfs in volume:", len(volume.listdir("/pdfs", recursive=False)))
    print("documents in volume:", len(_present()))


@app.local_entrypoint()
def plan() -> None:
    remaining = _remaining()
    print(f"manifest {len(_manifest())} | extracted {len(_present())} | remaining {len(remaining)}")


@app.local_entrypoint()
def status() -> None:
    present = _present()
    pdfs = len(volume.listdir("/pdfs", recursive=False))
    print(f"pdfs in volume:      {pdfs}")
    print(f"documents extracted: {len(present)}")
    print(f"remaining:           {len(_remaining())}")
    ledger = "/ocr/_ledger"
    try:
        entries = volume.listdir(ledger, recursive=False)
    except Exception:
        entries = []
    print(f"ledger files:        {len(entries)}")
