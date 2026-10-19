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
import os
import subprocess
import sys
import time
from pathlib import Path

import modal

ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT / "packages" / "core" / "src" / "brh_core"
LOCAL_DATA = ROOT / "data"
LOCAL_OCR = LOCAL_DATA / "ocr"
LOCAL_PDFS = LOCAL_DATA / "raw" / "web"

# Cost is GPU-hours: pages x seconds-per-page, whatever the concurrency. Two
# things actually reduce the bill, and both are set here:
#   * the cheapest GPU that is also the fastest at batch size 1 — L4 measured
#     7.2-10.1 s/page against A100's 9.4-14.7, at a third of the price;
#   * few containers. Concurrency buys wall-clock, not savings, and every extra
#     container pays another model load plus the post-run scaledown window.
BATCH_GPU = os.environ.get("BRH_GPU", "L4")
MAX_CONTAINERS = int(os.environ.get("BRH_MAX_CONTAINERS", "2"))
SCALEDOWN_SECONDS = int(os.environ.get("BRH_SCALEDOWN", "10"))  # default is 60

# Measured on this corpus, inference only (bench on 3 pages of two documents).
MEASURED_S_PER_PAGE = {"L4": 8.6, "T4": 11.4, "A100-80GB": 12.0}
GPU_PRICE_PER_HOUR = {"L4": 0.80, "T4": 0.59, "A100-80GB": 2.50}


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
URLMAP = Path("/data/urls")  # sha256 -> source URL, so a URL can be skipped before fetching


def _is_done(doc_dir: Path) -> bool:
    """A document counts as extracted only when its markdown is complete.

    Zero bytes means an interrupted write, not an empty document: treating it as
    done would silently ship a blank page set, and re-OCR is far cheaper than
    that. The atomic write in ``_ocr`` means readers never see a partial file,
    but the size check also covers volumes written by older runs.
    """
    document = doc_dir / "document.md"
    return document.is_file() and document.stat().st_size > 0


def _write_atomic(path: Path, text: str) -> None:
    """Write via a temporary neighbour and rename, so a kill never truncates."""
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def _fetch(url: str) -> tuple[str, Path]:
    """Download one PDF into the volume, content-addressed (see fetch.py)."""
    from brh_core.ingestion.fetch import fetch_pdf

    return fetch_pdf(url, PDFS)


def _ocr_url(url: str, gpu: str, *, engine=None) -> dict:
    """Fetch a URL, then OCR it unless that exact content is already extracted."""
    try:
        digest, _ = _fetch(url)
    except Exception as error:
        return {"url": url, "status": "fetch-failed", "gpu": gpu,
                "error": f"{type(error).__name__}: {error}"}
    _record_url(digest, url)
    result = _ocr(digest, gpu, engine=engine)
    result["url"] = url
    return result


def _record_url(digest: str, url: str) -> None:
    """Remember which URL produced this hash.

    Without it a shard can only learn a document is done *after* downloading it —
    one wasted fetch per duplicate. With it, `export_done` hands every runner a
    URL list that excludes finished work before any bytes move.
    """
    URLMAP.mkdir(parents=True, exist_ok=True)
    path = URLMAP / digest
    if not path.is_file():
        path.write_text(url + "\n", encoding="utf-8")


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
    if page_limit is None and _is_done(doc_dir):
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
    _write_atomic(doc_dir / "document.md", markdown)
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
    _write_atomic(doc_dir / "meta.json", json.dumps(meta, indent=1))

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


@app.function(
    gpu=BATCH_GPU,
    timeout=3600,
    volumes=MOUNTS,
    max_containers=MAX_CONTAINERS,
    scaledown_window=SCALEDOWN_SECONDS,
    retries=2,
)
def ocr_group(shas: list[str]) -> list[dict]:
    """Several documents in one container: the model loads once."""
    from brh_core.ingestion.engines import PaddleOcrVlEngine

    engine = PaddleOcrVlEngine(chart_recognition=True)
    results = [_ocr(sha, BATCH_GPU, engine=engine) for sha in shas]
    skipped = sum(1 for row in results if row["status"] == "skipped")
    if skipped:
        print(f"group: {skipped}/{len(results)} already extracted, not redone", flush=True)
    return results


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


# Optional static shard for shared corpora: "0/2" takes even documents, "1/2" odd.
# Same rule as `brh_core.ingestion.ocr run --shard`, over the same manifest order,
# so a Colab worker and this cluster never touch the same document.
SHARD = os.environ.get("BRH_SHARD", "")


def _shard_of(shas: list[str]) -> list[str]:
    if not SHARD:
        return shas
    try:
        index, total = (int(part) for part in SHARD.split("/", 1))
    except ValueError:
        raise SystemExit(f"BRH_SHARD expects I/N, got {SHARD!r}") from None
    if total < 1 or not 0 <= index < total:
        raise SystemExit(f"BRH_SHARD {SHARD}: need 0 <= I < N")
    return shas[index::total]


def _remaining() -> list[str]:
    """Manifest hashes whose ``document.md`` is missing, empty, or absent."""
    manifest = Path(os.environ.get("BRH_MANIFEST", LOCAL_OCR / "manifest.jsonl"))
    wanted = [
        json.loads(line)["sha256"]
        for line in manifest.read_text().splitlines()
        if line.strip()
    ]
    present = {
        entry.path.split("/")[-2]
        for entry in volume.listdir("/ocr", recursive=True)
        if entry.path.endswith("/document.md") and entry.size > 0
    }
    return _shard_of([sha for sha in wanted if sha not in present])


def _largest_remaining(count: int) -> list[str]:
    """Remaining documents with the most pages — a bench on 1-page docs measures noise."""
    profiles = ROOT / "experiments" / "gold" / "page-profiles.json"
    pages: dict[str, int] = {}
    if profiles.is_file():
        for row in json.loads(profiles.read_text()):
            pages[row["sha"]] = row["pages_in_doc"]
    return sorted(_remaining(), key=lambda sha: -pages.get(sha, 0))[:count]


@app.function(
    gpu=BATCH_GPU,
    timeout=7200,
    volumes=MOUNTS,
    max_containers=MAX_CONTAINERS,
    scaledown_window=SCALEDOWN_SECONDS,
    retries=1,
)
def ocr_url_group(urls: list[str]) -> list[dict]:
    """Fetch and OCR a few documents, model loaded once per group.

    Three documents per group, not five: this corpus has documents that cost
    1 690 s on their own, and five of those exceeded the old 3 600 s timeout —
    the whole group was cancelled and retried, wasting every document in it.
    A group must not be able to exceed its timeout by construction.
    """
    from brh_core.ingestion.engines import PaddleOcrVlEngine

    engine = PaddleOcrVlEngine(chart_recognition=True)
    results = [_ocr_url(url, BATCH_GPU, engine=engine) for url in urls]
    skipped = sum(1 for row in results if row["status"] == "skipped")
    failed = sum(1 for row in results if row["status"] == "fetch-failed")
    print(f"group: {len(results)} urls, {skipped} already extracted, {failed} fetch failed",
          flush=True)
    return results


URLS_PER_CONTAINER = int(os.environ.get("BRH_URLS_PER_CONTAINER", "3"))


@app.local_entrypoint()
def run_urls(limit: int = 0, detach: bool = False) -> None:
    """Dispatch the catalogue's outstanding URLs (no local PDFs involved).

    Without ``--detach`` this waits and reports, because ``modal run`` stops the
    app as soon as the local entrypoint returns — a fire-and-forget dispatch
    would be killed before its containers fetched anything.
    """
    source = Path(os.environ.get("BRH_URLS", LOCAL_OCR / "urls.jsonl"))
    if not source.is_file():
        print(f"no url list at {source} — run scripts/export_urls.py first")
        return
    rows = [json.loads(line) for line in source.read_text().splitlines() if line.strip()]
    urls = _shard_of([row["url"] for row in rows])
    batch = urls[:limit] if limit else urls

    # Refuse to start when the workspace credit is under the floor. Dispatching
    # is the one decision that spends money, so it is the one that gets checked.
    floor = os.environ.get("BRH_MIN_REMAINING", "5")
    guard = Path(__file__).parent / "spend_guard.py"
    if os.environ.get("BRH_SPEND_GUARD", "1") == "1" and guard.is_file():
        check = subprocess.run([sys.executable, str(guard), "--check", "--floor", floor],
                               capture_output=True, text=True)
        print(check.stdout.strip().splitlines()[-1] if check.stdout.strip() else "")
        if check.returncode != 0:
            print(f"credit is below ${floor} — not dispatching")
            return

    groups = [batch[i:i + URLS_PER_CONTAINER] for i in range(0, len(batch), URLS_PER_CONTAINER)]
    print(f"dispatching {len(batch)} of {len(urls)} url(s) in {len(groups)} container(s) "
          f"on {BATCH_GPU}, max {MAX_CONTAINERS} at a time, "
          f"{URLS_PER_CONTAINER} document(s) each")

    if detach:
        ocr_url_group.spawn_map(groups)
        print("dispatched; follow with `modal run scripts/modal_ocr.py::status`")
        return

    results = [row for group in ocr_url_group.map(groups) for row in group]
    done = [r for r in results if r["status"] == "done"]
    skipped = [r for r in results if r["status"] == "skipped"]
    failed = [r for r in results if r["status"] not in {"done", "skipped"}]
    pages = sum(r.get("pages", 0) for r in done)
    seconds = sum(r.get("seconds", 0) or 0 for r in done)
    print(f"\n{len(done)} done ({pages} pages, {seconds:.0f}s), "
          f"{len(skipped)} already extracted, {len(failed)} failed")
    for row in failed:
        print(f"  {row['status']:<13} {row['url'][:90]}")
        if row.get("error"):
            print(f"                {row['error'][:120]}")
    if failed:
        raise SystemExit(1)


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
    rate = MEASURED_S_PER_PAGE.get(BATCH_GPU)
    price = GPU_PRICE_PER_HOUR.get(BATCH_GPU)
    if rate and price:
        gpu_hours = total * rate / 3600
        print(f"  estimated {gpu_hours:.2f} GPU-hours = ${gpu_hours * price:.2f} "
              f"(at {rate:.1f} s/page, ${price:.2f}/h); "
              f"wall time about {gpu_hours / max(MAX_CONTAINERS, 1) * 60:.0f} min")
    if over:
        print(f"  {len(over)} container(s) hold a single document longer than "
              f"{MAX_PAGES_PER_GROUP} pages: "
              + ", ".join(f"{g[0][:8]} ({pages.get(g[0], 0)}p)" for g in over))
    ocr_group.spawn_map(groups)  # durable: run with --detach to close the terminal
    print("dispatched; follow with `modal run scripts/modal_ocr.py::status`")


@app.function(volumes=MOUNTS, timeout=300)
def _url_map() -> dict[str, str]:
    mapping: dict[str, str] = {}
    if URLMAP.is_dir():
        for path in URLMAP.iterdir():
            if path.is_file():
                mapping[path.name] = path.read_text(encoding="utf-8").strip()
    return mapping


@app.local_entrypoint()
def export_done() -> None:
    """Write the two skip lists runners consume, from the volume's own state."""
    entries = volume.listdir("/ocr", recursive=True)
    done = {entry.path.split("/")[-2] for entry in entries
            if entry.path.endswith("/document.md") and entry.size > 0}
    (LOCAL_OCR / "done_shas.txt").write_text("\n".join(sorted(done)) + "\n", encoding="utf-8")

    mapping = _url_map.remote()
    urls = sorted({url for url in mapping.values() if url})
    (LOCAL_OCR / "done_urls.txt").write_text("\n".join(urls) + "\n", encoding="utf-8")
    print(f"{len(done)} document(s) -> done_shas.txt")
    print(f"{len(urls)} source url(s) -> done_urls.txt")


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
