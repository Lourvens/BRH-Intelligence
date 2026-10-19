# Batch OCR — manifest, ledger, output

The OCR stage turns PDFs into page-marked markdown. It is a batch job, not a
service: it takes a manifest, writes documents and a ledger, and can be re-run
until everything is done.

## Shape of a run

```
manifest.jsonl ──▶ run_batch ──▶ <out>/<sha256>/document.md
                                    <out>/<sha256>/assets/pNNN/*.jpg
                                    <out>/<sha256>/meta.json
                   ledger  ──▶ <out>/state.jsonl
```

### `manifest.jsonl` — what should exist

One JSON object per document, keyed by `sha256`:

```json
{"sha256": "110b25ca…", "path": "data/raw/web/110b25ca….pdf"}
```

Built with `python -m brh_core.ingestion.ocr manifest --from-dir data/raw/web`.
Files named after their own hash are **verified**, not re-derived: a mismatch
means the file is not the document it claims to be, and the manifest refuses to
be written.

The key is the hash, not the filename: a re-download that changes bytes is a
different document, and a renamed file is the same one.

### `state.jsonl` — what happened

Append-only, one event per line, never rewritten:

```json
{"ts":"…","batch":"20261018T181500Z","sha256":"110b25ca…","event":"started","attempt":1,
 "engine":"paddleocr-vl","engine_version":"3.7.0"}
{"ts":"…","batch":"20261018T181500Z","sha256":"110b25ca…","event":"done","attempt":1,
 "pages":10,"chars":13393,"figures":7,"seconds":72.1}
{"ts":"…","batch":"20261018T181500Z","sha256":"63b4ca02…","event":"failed","attempt":1,
 "error":"RuntimeError: …","traceback":"…"}
```

Status is a **replay** of the log, never a separate field that can disagree with
it. Every event carries the batch id and the attempt number, so a document's
whole history is one `grep` away.

### Decisions the runner makes

| Situation | Behaviour |
|---|---|
| last event `done`, `document.md` present | skip |
| last event `failed`, no `--retry-failed` | skip |
| last event `failed`, `--retry-failed` | re-run, `attempt` + 1 |
| `--max-attempts` reached | report `exhausted`, never retried again |
| `--force` | re-run regardless |
| source file missing | recorded as `failed`, batch continues |

A failed document never leaves a half-written `document.md`: the file is staged
and atomically replaced only after assembly succeeds.

## Output per document

`document.md` carries `<!-- page N -->` markers — 1-based, matching the PDF
viewer's `#page=N` (ADR-0005). Figures are copied beside the document and
referenced relatively, so the directory can be moved or zipped without breaking:

```
![](assets/p001/img_in_image_box_140_279_370_410.jpg)
```

`meta.json` records the engine, its version, page/char/figure counts, duration,
and the batch that produced it — enough to reproduce a result later.

## Markup

Engines report structure differently, so `brh_core.ingestion.markdown` normalises
it: `<div>` wrappers unwrapped, simple HTML tables turned into GFM pipe tables,
complex ones kept as attribute-free HTML, entities unescaped. Rows with unequal
cell counts stay HTML on purpose — padding them would shift values by a column.

## Running it

Anywhere with Python 3.10+ and torch; CPU works, a GPU is faster.

```bash
# once
pip install "paddleocr[doc-parser]" "transformers>=5.0.0"
export PYTHONPATH="$PWD/packages/core/src"

# every batch
python -m brh_core.ingestion.ocr manifest --from-dir data/raw/web --out data/ocr/manifest.jsonl
python -m brh_core.ingestion.ocr run --manifest data/ocr/manifest.jsonl --out data/ocr
python -m brh_core.ingestion.ocr run --manifest data/ocr/manifest.jsonl --out data/ocr --retry-failed
python -m brh_core.ingestion.ocr status --out data/ocr
```

On a machine without a GPU, `scripts/colab-ocr.sh` does the same on a Colab VM
in one command:

```bash
bash scripts/colab-ocr.sh data/raw/web data/ocr
```

It installs the OCR stack, puts `brh_core` on `PYTHONPATH` (no Postgres or
Pinecone), builds the manifest, runs the batch, and prints the ledger status. A
reclaimed VM loses the working directory, not correctness: re-running resumes
from `state.jsonl` wherever it was kept.

## Engine

`brh_core.ingestion.engines.PaddleOcrVlEngine` — PaddleOCR-VL 0.9B through the
`transformers` backend (no Paddle GPU wheel, no vLLM), chart recognition on.
The batch runner only needs `parse(pdf, workdir) -> OcrDocument`, so another
engine is a new adapter, not a change to the runner.

## Modal cluster

`scripts/modal_ocr.py` runs the same engine on Modal, one container per group of
eight documents, with the corpus and the output on a shared volume:

```
/data/pdfs/<sha>.pdf              uploaded once, hash-verified
/data/ocr/<sha>/document.md       output, page-marked markdown
/data/ocr/<sha>/assets/           figures
/data/ocr/_ledger/<sha>.jsonl     one append-only ledger per document
```

A per-document ledger is not a style choice: containers finish concurrently, and
one shared `state.jsonl` would interleave lines from different writers. A
document whose `document.md` exists is skipped, so dispatching the whole
manifest twice costs nothing.

```bash
modal run scripts/modal_upload.py            # pdfs + existing output + manifest
modal run scripts/modal_upload.py::plan      # manifest / extracted / remaining
modal run scripts/modal_ocr.py::bench        # T4 vs L4 vs A100 on real pages
modal run --detach scripts/modal_ocr.py::run --limit 8
bash scripts/modal-pull.sh data/ocr --clean  # download, merge ledgers, drop scratch
```

Two things bite in a fresh image, both invisible on Colab:

- `paddleocr[doc-parser]` does **not** install torch. Colab has it preinstalled;
  a slim image does not, and the failure surfaces late as
  `Could not load any image processor class for PP-DocLayoutV3` because
  `PPDocLayoutV3ImageProcessor` lives in the torchvision backend. Install
  `torch` and `torchvision` explicitly.
- `brh_core/__init__` imports `brh_core.config`, so the OCR image also needs
  `pydantic` and `pydantic-settings` even though the runner itself is stdlib-only.

Models are baked into the image at build time (`_bake_models`): otherwise every
container downloads ~1.8 GB before its first page, which is both slow and
indistinguishable from OCR time in a benchmark.

Measured on this corpus, inference only, three pages of two documents:

| GPU | cost | s/page | note |
|---|---|---|---|
| L4 | $0.80/h | **7.2 – 10.1** | faster than A100 here |
| T4 | $0.59/h | 9.4 – 13.4 | |
| A100-80GB | $2.50/h | 9.4 – 14.7 | batching would be needed to use it |

At batch size 1 with a 0.9 B model the pipeline is latency-bound, so A100's
bandwidth and SM count buy nothing; L4 is both faster and three times cheaper.
vLLM is the lever that would change this, but PaddleOCR documents that the
`transformers` engine and vLLM cannot share an environment, so it needs its own
image and a two-process server/client split.

## Splitting the corpus between machines

Two runners can share one manifest without a queue or a lock:

```bash
python -m brh_core.ingestion.ocr run --manifest … --out … --shard 0/2
python -m brh_core.ingestion.ocr run --manifest … --out … --shard 1/2
```

`--shard I/N` takes every N-th document starting at I. The split is a pure
function of manifest order, so the two sets are disjoint by construction; each
side keeps its own ledger and the results are unioned
(`scripts/merge_ocr.py`, which `modal-pull.sh` calls).

`--max-pages P` stops a run after roughly P pages. A document is never split, so
a single longer document still runs — that is what keeps a small budget from
deadlocking. On Colab the budget is the unit of loss: `/content` is erased when
the runtime dies, so a session should be short enough that losing it is cheap.

**Put Colab output on Google Drive.** With `--out /content/drive/MyDrive/brh-ocr/ocr`
a disconnect costs one document instead of the whole session, which is the same
guarantee Modal gets from its volume — and it makes a 100-page budget safe.
Models and `pip` still have to be re-fetched per session (~3 min); that is the
price of free compute, not something the batch size can fix.


