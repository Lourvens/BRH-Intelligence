# Plan: OCR model evaluation (gold set → benchmark → CI regression gate)

- **Date**: 2026-10-15
- **Status**: Research complete; corpus composition measured (phase 1a, after a
  stratified sample). No implementation yet — gold set, harness, decision and
  regression gate are queued.
- **Feeds**: `brh_core.ingestion` (`extract.py`), ADR-0005 (page-aware ingestion,
  which deferred exactly this: *"Scanned/image-only PDFs would need OCR. Out of
  scope for v1."*)

## Goal

Decide, on evidence, **which OCR engine(s) turn the image-only share of the BRH
corpus into page-accurate French text** — and keep that decision honest over
time with a regression gate. Quality, efficiency and reliability are all scored,
because for a central bank a fast engine that invents a sentence is worse than a
slow one that leaves a gap.

Phases:

| # | Phase | Deliverable | Gate to pass |
|---|---|---|---|
| 0 | Research | this document | — (done) |
| 1 | Reconnaissance + **gold standard dataset** | `experiments/gold/` with a versioned, hand-transcribed reference | protocol written; inter-annotator disagreement measured |
| 2 | **Experiment benchmark** | harness + one ranked evaluation round, reproducible from a single command | run manifest reproduces the published numbers |
| 3 | Decision | ADR: primary engine, Fallback, routing rule | ADR merged |
| 4 | **CI regression benchmark** | fast offline gate + scheduled full re-run | gate green in CI within budget |

## What this task is, and is not

| In scope | Out of scope |
|---|---|
| Corpus composition (digital vs scan), resolution, layout | Chunking, embedding, indexing |
| Gold standard dataset + transcription protocol | Retrieval/prompt quality |
| Benchmark harness: quality / efficiency / reliability | The agent, MCP tools, web UI |
| Ranked evaluation with confidence intervals | Fine-tuning a model (revisit only if nothing passes) |
| CI regression gate + drift detection | Tuning the *product* prompts |

The output of phase 3 is **one engine plus a routing rule**, not a framework.

## What we measured (2026-10-15, live)

**Corrected the same day, after a stratified sample.** The first pass looked at
the 27 documents the backfill had reached — and the queue is drawn oldest-first,
so it described 2018 rather than the corpus. `make inventory ARGS="--sample 90"`
then pulled 10 documents from each of the 9 publication years, and everything
below is re-measured over **116 documents, 1 192 pages, 128 MB** (PyMuPDF 1.28.2).

| Probe | Result | Implication |
|---|---|---|
| Born-digital | **88 / 116 (75.9%)** — embedded fonts, no raster coverage | Most of the corpus needs **no OCR at all**: a fallback path, not a rewrite |
| Image-only | **24 / 116 (20.7%)** — zero extractable chars, ~100% raster coverage | **336 of 1 192 pages (28.2%) have no text layer** — the 242 pages of these documents plus 94 scanned pages hiding inside the 11 *hybrid* documents (some pages scanned, some digital). A per-document verdict hides them; the router must work per page |
| Suspect text layer | 4 / 116 (3.4%) — a real text layer *and* ~full raster coverage | Provenance unknown, possibly a previous OCR. Verify such a layer, never trust it |
| Scan resolution | dominant raster: min **74**, median **150**, max 300 dpi | **25% below 150 dpi, 83% below 200, 96% below 300.** The literature assumes 300–400. Biggest quality risk |
| Where the scans are | 2018 **11**, 2022 **7**, 2026 2, 2019/20/23/24 one each, 2021 and 2025 **none** | Not a legacy problem: two 2026 documents arrive scanned, and 2022 is 70% scans |
| Batch structure | 2018 = old circulars (*"89-1"*, *"95-1"*, *"106"*, *"108"*); 2022 = *"Circulaire 122…127-pdf"*, *"92-1-pdf"* | Two scanning campaigns, with a `-pdf` naming convention. Not random degradation |
| Corpus size | 1 192 pages over 116 documents = 10.3 pages/document | **~12 000 pages** for the 1 169 documents — measured, not guessed |
| Hardware | 8 vCPU, 15 GB RAM, **no GPU**, `nvidia-smi` absent | Every candidate must be scored on CPU, or a GPU acquired on purpose |

Two of the first pass's claims needed correcting, and one held:

- **The rate held.** 78 / 19 / 4 became 75.9 / 20.7 / 3.4. But the rate was never
  the problem: the biased sample could not see *where* the scans are. They are
  concentrated — 2018 and 2022 hold 18 of the 24 — and two publication years have
  none at all. A uniform 19% would have been the wrong mental model.
- **The resolution reading was wrong.** "74–75 dpi for two documents" came from
  the *highest-DPI image on the page*, which is a small logo. Measured on the
  **dominant** raster the picture is both worse and plainer: median **150 dpi**,
  with 96% of scanned documents below the 300 dpi the OCR literature assumes.
- **"~9 000–12 000 pages, unknown"** is now ~12 000, measured.

## What the field says (2026-10)

Two well-known leaderboards, two different winners — which is the whole argument
for building our own gold set:

| Benchmark | Leader | Notes |
|---|---|---|
| **OmniDocBench** v1.7 (Sep 2026) | TeleOCR 96.91, OvisOCR2 96.47, PaddleOCR-VL-1.6 96.34 | Overall = text edit distance, table TEDS and formula CDM averaged. Small (0.8–1.2B) specialised VLMs now lead |
| **olmOCR-Bench** (7 010 tests / 1 402 PDFs) | Infinity-Parser2-Pro 87.6, Chandra 2 85.9, dots.mocr 83.9, LightOnOCR-2-1B 83.2, olmOCR-2 82.4 | Unit-test style pass rate. Ranks PaddleOCR-VL ~80, i.e. *below* its OmniDocBench position |

**Material dominates model choice.** A 22-engine study across four tracks
(Oct 2026) found the rank order on historical books versus modern documents
nearly uncorrelated (**Spearman ρ 0.22**). Concrete failures it recorded:

- Classic engines read the two columns of a page **line by line across both
  columns** — CER 73–75% — and nothing in the output says so.
- Two models repeated a decorative header **until their token limit**.
- One replaced handwritten lines with **fluent invented sentences**.
- One returned *no text at all* for 56 of 60 lines.

For us, that means a leaderboard position predicts very little about what
happens to a 74 dpi 2018 circular with a two-column table.

**Cost and speed (per the same study, and a datalab CPU benchmark):**

| Engine | Quality | Cost / 1k pages | CPU throughput |
|---|---|---|---|
| PaddleOCR-VL | 85.4 (4-track mean) | **$0.039** (L4) | PP-OCRv6 small: 1.24 pages/s @ 8 cores; PP-StructureV3: ≤0.089 |
| OvisOCR2 | 90.0 | $0.074 | — |
| GLM-OCR | 91.4 | $0.137 | — |
| olmOCR 2 | 94.3 | $0.161 | — |
| dots.mocr | **94.7** | $0.326 | — |
| Tesseract 5 | 19.3–66.2 depending on track | ~$0 | **1.37 pages/s @ 8 cores**, 5.5 s/page median |
| Indra OCR (1M params) | 41.3 on text | — | **14.2 pages/s @ 8 cores**, 228 ms/page |

The Pareto set is PaddleOCR-VL, OvisOCR2, GLM-OCR, olmOCR 2, dots.mocr — all of
which need a GPU we do not have. The CPU column is the constraint that shapes
phase 2's candidate ladder.

**Licensing is not uniform** and is a scored dimension, not a footnote:

| Model | Terms |
|---|---|
| Tesseract, PaddleOCR | Apache-2.0 |
| dots.ocr | MIT plus a supplement (attribution required for modified weights) |
| **Chandra** | code Apache-2.0, **weights modified OpenRAIL-M** — free only under $2M revenue and not usable competitively with the vendor's API |
| PyMuPDF (already in use) | AGPL — accepted in ADR-0005, worth re-reading once OCR output is redistributed |

**Evaluation methodology, which is where OCR benchmarks usually go wrong:**

- `CER = (insertions + substitutions + deletions) / reference length`; WER is the
  same over words. Report **accuracy** as `1 - CER`, never a bare "accuracy".
- *"Even standardised metrics such as CER/WER cannot be compared directly between
  different implementations"* — normalisation of ligatures and Unicode differs per
  tool. We must **own the scorer** and declare our normalisation.
- Ground-truth noise sets a floor: one study found the best engine's CER on Latin
  pages was 8.5%, *"consistent with a floor of 4–7% from the reference alone."*
  **If we do not measure inter-annotator disagreement, our targets are meaningless.**
- For reading order, CER misses it entirely; use the flexible character accuracy
  or a read-order edit distance alongside.
- Sampling must be representative (stratified here, since we know the strata),
  not hand-picked.

## The three axes, and what we will actually report

| Axis | Metrics |
|---|---|
| **Quality** | CER / WER per stratum, reading-order edit distance, table TEDS *only if* tables matter for retrieval, and a task metric: does a citation still find the right page? |
| **Efficiency** | steady-state pages/s at fixed concurrency, median and p90 ms/page, peak RSS, model load time, disk footprint, $/1 000 pages |
| **Reliability** | determinism (same input twice → identical bytes), empty-output rate, repetition-loop rate, hallucination rate, crash rate, **quality at 74 dpi**, and graceful behaviour on a page it cannot read |

Reliability needs one bespoke check: a **repetition/hallucination detector** run
over every output, because the failure modes above are silent. Cheap version:
flag outputs containing n-grams repeated past a threshold, or long runs of text
that the image-side confidence does not support.

## Decision questions (resolve by experiment, then ADR)

1. **GPU, or CPU-only?** Local GPU, a rented GPU for the benchmark phase, or
   strictly CPU? This decides whether the candidate ladder includes VLMs at all.
2. **May documents leave our infrastructure?** A central bank's regulatory
   circulars going to a hosted OCR API is a governance question, not a technical
   one. The sibling project used LlamaCloud; we deliberately moved offline.
3. **Who transcribes the gold set, and how many pages can we afford?**
4. **What is the quality bar?** Retrieval-grade (CER ≲5%, errors are noise in a
   chunk) is far cheaper than citation-grade (CER ≲1%, a user reads the text).
5. **Plain text plus reading order, or tables and layout too?** The sibling
   project treated table structure as a requirement; circulars and bulletins have
   real tables.
6. **Is a paid vendor acceptable?** It was for the sibling, and it changes the
   Pareto set completely.

## Phase 1 — Reconnaissance and the gold standard dataset

Two jobs, in order.

**1a. Corpus composition — done (2026-10-15).** `make inventory ARGS="--sample 90"`
pulled 10 documents from each publication year, and the composition table above
is measured over 116 documents. What the sampling changed is recorded there; the
short version is that the scan *rate* barely moved but the scans turned out to be
concentrated in 2018 and 2022, and the resolution picture was worse than the first
pass suggested. Remaining: stratify by **document family** as well as year, once
that is useful — the taxonomy lives in `brh_analytics`, not in the core, so it is
deliberately not part of the sample selector.

**1b. Benchmark documents — chosen, not transcribed.** Two passes on purpose. A
machine pass (`select_documents.py`) proposes a cover of every class — 22
documents, 141 pages, in `candidates.json` — and **a human picks from it**. The
picks are in [`experiments/gold/documents/`](../../experiments/gold/documents/),
adopted by `build_manifest.py`, which verifies each file against its own
`sha256`, derives the classes it covers and writes `manifest.json`.

| Tier | Size | Purpose |
|---|---|---|
| **CI set** | 3 documents, 14 pages | Fast regression gate |
| **Eval set** | 6 documents, 27 pages | The one ranking round that decides the engine |

The human pick is a third of the machine cover's page count — the right trade for
manual transcription — and it **drops five of the thirteen classes** (`blank`,
`digital/cover`, `digital/table+figure`, `digital/figure+2col`,
`digital/table+figure+2col`). Three documents would close all five for 38 pages
and 2.5 MB, and `build_manifest.py` reports the gap on every run rather than
filling it. The set also spans only 2018, 2022, 2023 and 2026.

The unit is the **document**, not the page. A benchmark entry is a file; ingestion
and OCR both work a file at a time; and page-level selection had hidden that — 11
of the 116 documents are *hybrid*, carrying scanned pages among digital ones — the
router must decide **per page** even though the set is chosen per document.

The classes are technical, not editorial — **format × resolution × content**:

- `digital` (text layer) as the **control** — if extraction does not score
  near-perfect here, the harness is broken, not the model;
- `scan` split by resolution: **bad** <150 dpi (70 pages in the corpus sample),
  **ok** 150–249 (228), **good** ≥250 (22);
- `blank` — no text layer *and* no raster (16 pages): real blank pages that
  ingestion must not chunk or cite;
- content on digital pages: `text-only` (537 pages), `table` (167), `2col` (37),
  `cover` (34), `figure` (27) and their combinations;
- colour, recorded per page: rgb, gray, indexed (bilevel), cmyk, ICCBased,
  vector-only.

Two limits are recorded rather than papered over — see
[`experiments/gold/README.md`](../../experiments/gold/README.md):

- **scanned pages cannot be classified by content at all** (no text, no vector
  lines), so the scan classes cover *format × resolution* only, and content is
  confirmed during transcription;
- **the content tags are heuristics.** A contact-sheet spot check caught
  `find_tables()` firing on covers and chart grids (58 of 275 pages, since
  tightened) and cover pages read as content. One consequence is substantive:
  **no scanned page with a data table has been found**, so "scan + table" is a
  class the corpus sample does not currently supply.

**Transcription protocol** (write it before transcribing, or the reference will
be inconsistent):

- verbatim French, accents and ligatures preserved as printed;
- hyphenation at line breaks resolved silently; hard hyphens kept;
- headers/footers/page numbers **excluded** and recorded separately;
- illegible marks as `⟨?⟩`, best-guess-with-flag as `⟨mot?⟩`;
- reading order for multi-column pages spelled out;
- **confirm the page's class while transcribing** and correct the label in
  `manifest.json` — for a scan that is the only point at which its content
  (table? figure? prose?) is ever known;
- every page keyed `(sha256, page_number)` so the reference survives a re-download.

**Measure the floor.** Re-transcribe ~20 pages blind and report the disagreement
rate. That number is the best CER any engine can be credited with.

## Phase 2 — The benchmark harness

One command, one manifest, one table.

**Reproducibility is a requirement, not a wish:**

- pin every model to an immutable revision and hash the weights;
- pin library versions in a lockfile; record the container/image digest;
- deterministic decoding (greedy, temperature 0, fixed seed where the runtime
  allows), and **measure** whether a run is bit-identical rather than assuming it;
- record CPU/GPU model, core count, wall time, peak RSS;
- emit `run.json`: gold-set hash, model hashes, environment, per-page metrics;
- the published table must be regenerable from that manifest alone.

**A pre-processing factor, not a hidden setting:** at 74 dpi, upscaling and
deskew/binarisation are likely to matter more than the model choice. Score
`raw` versus `preprocessed` as an explicit arm, since it is a legitimate way to
get a CPU engine to beat a VLM.

**Candidate ladder (CPU tier first, because that is what we can run today):**

1. Tesseract 5 (`fra`) — the baseline to beat, and the licence-safe default;
2. PaddleOCR PP-OCRv6 (RapidOCR / ONNX) — better text quality on CPU;
3. docTR or EasyOCR — if the first two disagree, a third opinion;
4. Indra OCR — CPU-native and very fast; verify claims independently;
5. VLM tier — olmOCR 2 / dots.mocr / PaddleOCR-VL / Chandra, **only** if a GPU is
   available, and only after the licence questions are settled.

## Phase 3 — Decision

An ADR, not a spreadsheet: the primary engine, the fallback, and the **routing
rule** for the ingestion pipeline — for example *try the text layer; if a page
yields fewer than N characters or fails a quality check, OCR it*. State the
quality bar, the meaning of a routing miss, and what the pipeline does with a
page it cannot read (flag it — never silently omit it).

## Phase 4 — CI regression benchmark

The repo rule is that tests run **offline, no network**, which rules out calling
hosted OCR in CI. So the gate splits:

| Where | What | Why |
|---|---|---|
| CI (fast, offline) | Scorer + threshold gate over **pinned predicted outputs**; determinism check | Tests the harness and the gate, not the upstream models. Seconds to minutes |
| Scheduled (self-hosted) | Re-run the real engines, compare against the stored baseline, open an issue on regression | Catches actual drift: a new model revision, a library bump |

Gate design:

- an **absolute ceiling per stratum**, not one global number — 74 dpi pages will
  never match born-digital ones;
- a **no-regression margin wider than the confidence interval**, so noise does
  not fail the build;
- a runtime budget, so a regression in speed is visible too;
- baselines are **versioned artifacts updated only by a human**, never
  auto-blessed — otherwise the gate ratchets downward and stops meaning anything.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Below-100-dpi scans are simply unrecoverable | High — 3 of the 24 scanned documents, and they are 2018 regulatory circulars | Deal with it in phase 2 via the preprocessing arm; otherwise flag the page rather than fake it |
| VLM hallucination in a citation | High — a central bank publishing invented text | Scored as its own reliability metric; CPU-tier engines preferred unless a VLM is clearly better |
| A document's own text layer is a bad OCR of unknown provenance | Medium — 4 documents carry one | Verify it like any other engine's output, and score it as a candidate rather than a source of truth |
| Ground-truth noise > model differences | Medium — would make the ranking meaningless | Measure the floor before ranking |
| CPU-only throughput | Medium — 336 pages need OCR today; ~28% of a ~12 000-page corpus is ~3 400 | Prefer the fast CPU tier; batch overnight |
| A "scan + table" page may not exist in the sample | Medium — an untested class would be missing from the results | Note it explicitly, or widen the sample before ranking |
| Licence surprise after the choice | Medium | Licence is a scored column in phase 2, not a footnote |

## Open item carried from the inventory track

`brh_core.ingestion` is still stubbed (`metadata.py` → `extract.py` →
`chunk.py` → `pipeline.py`). Phase 3's output plugs into `extract.py`, so the
routing rule should be designed there rather than in a separate pass.
