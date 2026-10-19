"""Run the BRH corpus OCR on a Modal GPU cluster.

One container handles one document, so a document is the unit of retry and a
container never waits on another one's lock. The shared volume holds::

    /data/pdfs/<sha256>.pdf          input, uploaded once
    /data/ocr/<sha256>/document.md   output, page-marked markdown
    /data/ocr/<sha256>/assets/       figures
    /data/ocr/<sha256>/meta.json     engine, version, pages, seconds
    /data/ocr/_ledger/<sha256>.jsonl one append-only ledger per document

Per-document ledgers matter because containers write in parallel: a single
shared ``state.jsonl`` would interleave lines from different writers.

A document that already has ``document.md`` is skipped, so re-running a batch —
or a chunk of one — never redoes work.

    modal run scripts/modal_ocr.py::upload
    modal run scripts/modal_ocr.py::plan
    modal run scripts/modal_ocr.py::bench          # 2 docs x 3 pages, 3 GPUs
    modal run --detach scripts/modal_ocr.py::run --limit 20
    modal run scripts/modal_ocr.py::status
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import modal

ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT / "packages" / "core" / "src" / "brh_core"
LOCAL_DATA = ROOT / "data"
LOCAL_OCR = LOCAL_DATA / "ocr"
LOCAL_PDFS = LOCAL_DATA / "raw" / "web"

BATCH_GPU = "A100-80GB"  # $2.50/h — requested; measured 9-15 s/page vs L4's 7-10
MAX_CONTAINERS = 8  # Starter plan allows 10 concurrent GPUs


def _bake_models() -> None:
    """Download the layout + VL models into the image at build time.

    Without this every container fetches ~1.8 GB before its first page, which is
    both slow and indistinguishable from OCR time in the measurements.
    """
    from paddleocr import PaddleOCRVL

    PaddleOCRVL(engine="transformers", device="cpu")


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libgl1", "libglib2.0-0", "libgomp1")
    # torch/torchvision are *not* implied by paddleocr: the transformers backend
    # loads PPDocLayoutV3ImageProcessor from the torchvision backend, and Colab
    # only worked because torch was preinstalled there.
    .pip_install("torch", "torchvision")
    .pip_install(
        "paddleocr[doc-parser]>=3.7.0",
        "transformers>=5.0.0",
        "pymupdf",
        # brh_core/__init__ imports brh_core.config, which needs these
        "pydantic>=2",
        "pydantic-settings>=2",
    )
    .env(
        {
            "PYTHONPATH": "/root/src",
            # skip the hoster connectivity probe at every cold start
            "PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK": "True",
        }
    )
    .run_function(_bake_models, timeout=1800)
    .add_local_dir(str(CORE), remote_path="/root/src/brh_core")
)

app = modal.App("brh-ocr", image=image)
volume = modal.Volume.from_name("brh-ocr", create_if_missing=True)
MOUNTS = {"/data": volume}

PDFS = Path("/data/pdfs")
OUT = Path("/data/ocr")
LEDGER = OUT / "_ledger"


def _ocr(sha: str, gpu: str, *, engine=None, chart_recognition: bool = True,
         page_limit: int | None = None) -> dict:
    """OCR one document. ``page_limit`` turns it into a benchmark that writes nothing."""
    import shutil

    import pymupdf
    from brh_core.ingestion.engines import PaddleOcrVlEngine
    from brh_core.ingestion.ocr import assemble

    started = time.time()
    pdf = PDFS / f"{sha}.pdf"
    doc_dir = OUT / sha
    if page_limit is None and (doc_dir / "document.md").is_file():
        return {"sha": sha, "status": "skipped", "gpu": gpu}

    if not pdf.is_file():
        return {"sha": sha, "status": "missing-pdf", "gpu": gpu}

    work = Path("/tmp/work") / sha
    work.mkdir(parents=True, exist_ok=True)
    target = pdf
    if page_limit is not None:
        source = pymupdf.open(pdf)
        subset = pymupdf.open()
        subset.insert_pdf(source, from_page=0, to_page=min(page_limit, source.page_count) - 1)
        target = work / "subset.pdf"
        subset.save(str(target))

    if engine is None:
        engine = PaddleOcrVlEngine(chart_recognition=chart_recognition)
    if page_limit is not None:
        build = time.monotonic()
        engine._pipeline = engine._build()
        load_seconds = round(time.monotonic() - build, 1)
    else:
        load_seconds = None
    clock = time.monotonic()
    document = engine.parse(target, work)
    seconds = round(time.monotonic() - clock, 1)
    chars = sum(len(page.markdown) for page in document.pages)

    if page_limit is not None:
        shutil.rmtree(work, ignore_errors=True)
        return {
            "sha": sha,
            "status": "bench",
            "gpu": gpu,
            "pages": len(document.pages),
            "chars": chars,
            "seconds": seconds,
            "load_seconds": load_seconds,
            "s_per_page": round(seconds / max(len(document.pages), 1), 1),
        }

    doc_dir.mkdir(parents=True, exist_ok=True)
    markdown, figures = assemble(document, doc_dir)
    (doc_dir / "document.md").write_text(markdown, encoding="utf-8")
    meta = {
        "sha256": sha,
        "engine": document.engine,
        "engine_version": document.engine_version,
        "pages": len(document.pages),
        "chars": len(markdown),
        "figures": figures,
        "seconds": seconds,
        "gpu": gpu,
        "chart_recognition": chart_recognition,
        "finished_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (doc_dir / "meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")

    LEDGER.mkdir(parents=True, exist_ok=True)
    with (LEDGER / f"{sha}.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps({"event": "done", **meta}, ensure_ascii=False) + "\n")

    volume.commit()
    shutil.rmtree(work, ignore_errors=True)
    print(f"{sha[:8]} {len(document.pages)}p {seconds}s {chars:,}ch on {gpu}", flush=True)
    return {
        "sha": sha,
        "status": "done",
        "pages": len(document.pages),
        "seconds": seconds,
        "chars": chars,
        "figures": figures,
        "gpu": gpu,
        "elapsed": round(time.time() - started, 1),
    }


# --- batch ------------------------------------------------------------------


DOCS_PER_CONTAINER = 8  # fallback when a document has no recorded page count
MAX_PAGES_PER_GROUP = 50  # hard cap per container; a longer single document runs alone


@app.function(gpu=BATCH_GPU, timeout=3600, volumes=MOUNTS, max_containers=MAX_CONTAINERS, retries=2)
def ocr_group(shas: list[str]) -> list[dict]:
    """Several documents in one container: the model loads once."""
    from brh_core.ingestion.engines import PaddleOcrVlEngine

    engine = PaddleOcrVlEngine(chart_recognition=True)
    return [_ocr(sha, BATCH_GPU, engine=engine) for sha in shas]


# --- benchmarks -------------------------------------------------------------


@app.function(gpu="T4", timeout=1800, volumes=MOUNTS, max_containers=1)
def bench_t4(sha: str, pages: int = 3) -> dict:
    return _ocr(sha, "T4", page_limit=pages)


@app.function(gpu="L4", timeout=1800, volumes=MOUNTS, max_containers=1)
def bench_l4(sha: str, pages: int = 3) -> dict:
    return _ocr(sha, "L4", page_limit=pages)


@app.function(gpu="A100-80GB", timeout=1800, volumes=MOUNTS, max_containers=1)
def bench_a100(sha: str, pages: int = 3) -> dict:
    return _ocr(sha, "A100-80GB", page_limit=pages)


# --- local side -------------------------------------------------------------


def _remaining() -> list[str]:
    """Manifest hashes with no document directory in the volume."""
    manifest = LOCAL_OCR / "manifest.jsonl"
    wanted = [
        json.loads(line)["sha256"]
        for line in manifest.read_text().splitlines()
        if line.strip()
    ]
    present = {entry.path.rsplit("/", 1)[-1] for entry in volume.listdir("/ocr", recursive=False)}
    return [sha for sha in wanted if sha not in present]


def _largest_remaining(count: int) -> list[str]:
    """Remaining documents with the most pages — a bench on 1-page docs measures noise."""
    profiles = ROOT / "experiments" / "gold" / "page-profiles.json"
    pages: dict[str, int] = {}
    if profiles.is_file():
        for row in json.loads(profiles.read_text()):
            pages[row["sha"]] = row["pages_in_doc"]
    return sorted(_remaining(), key=lambda sha: -pages.get(sha, 0))[:count]


@app.local_entrypoint()
def bench(sha: str = "", pages: int = 3) -> None:
    targets = [sha] if sha else _largest_remaining(2)
    calls = {name: fn for name, fn in
             (("T4", bench_t4), ("L4", bench_l4), ("A100-80GB", bench_a100))}
    handles = [(name, fn.spawn(target, pages)) for name, fn in calls.items() for target in targets]
    rows = []
    for name, handle in handles:
        result = handle.get()
        rows.append(result)
        print(f"{name:<10} {result['sha'][:8]} {result['pages']}p {result['seconds']:>7.1f}s "
              f"{result['s_per_page']:>6.1f}s/page load {result['load_seconds']:>5.1f}s "
              f"{result['chars']:>8,}ch", flush=True)
    print()
    for result in sorted(rows, key=lambda r: r["s_per_page"]):
        print(f"{result['gpu']:<10} {result['sha'][:8]} {result['s_per_page']:>6.1f}s/page")


def _page_counts() -> dict[str, int]:
    """Page count per document, from the local per-page profile."""
    profiles = ROOT / "experiments" / "gold" / "page-profiles.json"
    if not profiles.is_file():
        return {}
    return {row["sha"]: row["pages_in_doc"] for row in json.loads(profiles.read_text())}


def _group_by_pages(documents: list[str], budget: int = MAX_PAGES_PER_GROUP) -> list[list[str]]:
    """Pack documents into containers without exceeding ``budget`` pages each.

    First-fit decreasing: the longest documents are placed first, which keeps the
    number of containers close to the theoretical minimum. A single document
    longer than the budget cannot be split without breaking one-file-per-document,
    so it gets a container to itself and is reported as over budget.
    """
    pages = _page_counts()
    groups: list[dict] = []
    for sha in sorted(documents, key=lambda name: -pages.get(name, DOCS_PER_CONTAINER)):
        size = pages.get(sha, DOCS_PER_CONTAINER)
        for group in groups:
            if group["pages"] + size <= budget:
                group["docs"].append(sha)
                group["pages"] += size
                break
        else:
            groups.append({"docs": [sha], "pages": size})
    return [group["docs"] for group in groups]


@app.local_entrypoint()
def run(limit: int = 0) -> None:
    remaining = _remaining()
    if not remaining:
        print("nothing to do: every manifest document has output")
        return
    batch = remaining[:limit] if limit else remaining
    groups = _group_by_pages(batch)
    pages = _page_counts()
    total = sum(pages.get(sha, 0) for sha in batch)
    over = [g for g in groups if sum(pages.get(s, 0) for s in g) > MAX_PAGES_PER_GROUP]
    print(f"dispatching {len(batch)} of {len(remaining)} remaining documents "
          f"({total} pages) in {len(groups)} container(s) on {BATCH_GPU}, "
          f"max {MAX_CONTAINERS} at a time, <= {MAX_PAGES_PER_GROUP} pages each")
    if over:
        print(f"  {len(over)} container(s) hold a single document longer than "
              f"{MAX_PAGES_PER_GROUP} pages: "
              + ", ".join(f"{g[0][:8]} ({pages.get(g[0], 0)}p)" for g in over))
    ocr_group.spawn_map(groups)  # durable: run with --detach to close the terminal
    print("dispatched; follow with `modal run scripts/modal_ocr.py::status`")


@app.local_entrypoint()
def status() -> None:
    entries = [entry.path.rsplit("/", 1)[-1] for entry in volume.listdir("/ocr", recursive=False)]
    done = [name for name in entries if name and name != "_ledger"]
    remaining = _remaining()
    print(f"documents with output: {len(done)}")
    print(f"remaining: {len(remaining)}")
    if remaining:
        print("next:", ", ".join(sha[:8] for sha in remaining[:8]))


@app.function(volumes=MOUNTS, timeout=600)
def _purge(paths: list[str]) -> list[str]:
    removed = []
    for path in paths:
        try:
            volume.remove_file(path, recursive=True)
            removed.append(path)
        except Exception as error:
            print(f"could not remove {path}: {error}")
    volume.commit()
    return removed


@app.local_entrypoint()
def cleanup(pdfs: bool = False) -> None:
    """Drop scratch state. PDFs stay unless ``--pdfs`` is passed."""
    targets = ["/ocr/_ledger"]
    if pdfs:
        targets.append("/pdfs")
    print("removed:", _purge.remote(targets))
