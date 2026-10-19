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

## Three runners

The corpus can be split across machines that never coordinate, because
`--shard I/N` is a pure function of manifest order. With five shards over 116
documents each worker gets 22-24 documents, which keeps every Colab/Kaggle batch
under the 30-document ceiling those platforms need:

| runner | GPUs | shard | limit per batch |
|---|---|---|---|
| Modal | 2 × L4 | `0/5`, `1/5` | ≤ 50 pages per container |
| Colab | 1 × T4 | `2/5` | 23 documents, `MAX_PAGES` per session, output on Drive |
| Kaggle | 2 × T4 | `3/5`, `4/5` | 23 documents per GPU, one output dir each |

Kaggle's "T4 x2" is two separate 16 GB cards, so the parallelism is
data-parallel: `scripts/kaggle-ocr.sh` starts one process per card with
`CUDA_VISIBLE_DEVICES`, each writing its own directory, then unions them with
`scripts/merge_ocr.py`. Two writers must never share one `state.jsonl`.

Colab output belongs on Drive (`--out /content/drive/MyDrive/brh-ocr/ocr`), or a
disconnect loses the whole VM's work rather than one document.

## Tensor knobs that do not exist

Measured on a T4, three pages of a real document — every override is worse than
the default or does not compile:

| setting | result |
|---|---|
| default (bf16) | **14.7 s/page** |
| `dtype=float32` | 44.1 s/page — 3x slower |
| `dtype=bfloat16` explicit | fails: `cv worker: Got unsupported ScalarType BFloat16` |
| `attn_implementation=sdpa` | fails: `HGNetV2Backbone does not support ... scaled_dot_product_attention` |
| `attn_implementation=flash_attention_2` | needs Ampere; T4 is Turing 7.5 |
| `max_pixels` 640 / 480 | 14.8 s/page — no measurable effect |
| `dtype=float16` | unsupported: the checkpoint pins bf16 |

So there is no tensor-level acceleration left on a T4, and vLLM — the one lever
that would change the shape of the problem — is documented as unstable below
compute capability 8.0. The remaining speed comes from hardware (L4 over T4, two
cards instead of one) and from doing less work (text-layer extraction for
born-digital pages), not from flags.

## Running the next corpus

`scripts/plan_batches.py` turns a manifest into the three-platform split and
checks the rules before anything is spent:

```bash
uv run python scripts/plan_batches.py --shards 4 --emit data/ocr/batches
```

```
corpus: 116 documents, 1192 pages
shard  worker    docs  pages  largest
0/4    modal       29    320       67   ! 67-page doc runs alone (>50 budget)
1/4    colab       29    307       67
2/4    kaggle      29    290       65
3/4    kaggle      29    275       56
```

It sorts by page count before slicing. In manifest order a split put 373 pages on
one worker and 148 on another — a wave waits on its slowest worker, so that
imbalance is wall time for nothing. Size-sorted, the same four shards spread 14%.

The emitted `manifest.balanced.jsonl` is the same documents in a different order,
so every runner still takes `--shard I/N` and the sets stay disjoint.

Merge when the three finish:

```bash
bash scripts/modal-pull.sh data/ocr
uv run python scripts/merge_ocr.py --from <colab-or-kaggle-output>
uv run python scripts/verify_ocr.py
uv run python scripts/purge_ocr.py --apply --ledger
```

## Sharding without coordination

`--shard I/N` takes every N-th document starting at I. The split is a pure
function of manifest order, so the two sets are disjoint by construction; each
side keeps its own ledger and the results are unioned by `scripts/merge_ocr.py`,
which `modal-pull.sh` also uses.

```bash
python -m brh_core.ingestion.ocr run --manifest ... --out ... --shard 0/5
BRH_SHARD=1/5 modal run --detach scripts/modal_ocr.py::run
```

`--max-pages P` stops a run after roughly P pages. A document is never split, so
a single longer document still runs — which is what keeps a small budget from
deadlocking. On Colab the budget is the unit of loss unless the output is on
Drive: `/content` is erased when the runtime dies.

Models and `pip` still have to be re-fetched per Colab session (~3 min); that is
the price of free compute, not something the batch size can fix.
