# Benchmark document set

**Status: 6 documents, 27 pages, reference built with LlamaParse.** The PDFs live
in `documents/`, named by their own `sha256`; the reference is in `reference/`
(one markdown file per document) and the dataset in `dataset.jsonl`. Nine scanned
pages are still OCR taken on faith, so this is a benchmark set, not yet a fully
verified gold set.

Phase 1b of
[`docs/plans/2026-10-15-ocr-evaluation-design.md`](../../docs/plans/2026-10-15-ocr-evaluation-design.md).

## How the set was chosen

Two steps on purpose, because the machine pass and the human pass disagree about
what a good benchmark document is:

1. **`select_documents.py` proposes a cover** of every technical class from the
   116-document stratified sample. It writes `candidates.json` — 22 documents,
   141 pages — and copies nothing.
2. **A human picks from that shortlist.** The picks go in `documents/`.
   `build_manifest.py` then verifies each file against its name, derives the
   classes it covers, picks the CI subset, and writes `manifest.json`.

The human set is far leaner than the machine cover — 27 pages against 141 — which
is the right trade for manual transcription. It also drops five classes, which is
recorded below rather than smoothed over.

`build_manifest.py` never invents documents. Adding one is a human decision.

## What is in it

| sha256 | Pages | Size | Year | Classes |
|---|---|---|---|---|
| `110b25ca` | 10 | 1.9 MB | 2026 | `2col`, `table`, `text-only`, `scan/good` |
| `63b4ca02` | 9 | 588 kB | 2023 | `2col`, `figure`, `table`, `table+2col`, `text-only` |
| `f2d799b9` | 4 | 840 kB | 2018 | `scan/bad` |
| `6ab9508c` | 2 | 384 kB | 2022 | `scan/ok` |
| `1a84a9a7` | 1 | 172 kB | 2018 | `scan/ok` |
| `f31dfee9` | 1 | 48 kB | 2026 | `table` |

**6 documents, 27 pages, 4.1 MB.** The CI subset is **3 documents, 14 pages** —
enough to see `scan/bad`, `scan/ok`, `digital/text-only` and `digital/table`, the
four classes an engine regression shows up in first.

Every file was hashed on the way in: the bytes match the filename, so the set is
content-addressed and survives a re-download unchanged.

## The reference — LlamaParse as the baseline

`reference/<sha256>.md` holds the reference **per document** — one file, with a
`<!-- page N -->` marker so pages stay addressable (citations are page-level,
ADR-0005). `reference/<sha256>.txt` is derived from it by stripping markdown
syntax, so the two can never disagree. `reference.json` holds the provenance.
Built by `build_reference.py`, tier `agentic`, French OCR, tables as markdown:
**27 pages, 39 323 characters, 390 credits**.

Options follow the sibling project's `llamaparse` skill. The one that matters
most is `processing_options.specialized_chart_parsing: "agentic"`: a chart comes
back as a **data table**, not as a picture described in prose. `63b4ca02` p7
returns `| Oct-19 | 1.7 | 24.0 |`, `| Nov-19 | 1.7 | 25.0 |` … instead of its
axis labels, and figures get described — `icon: illustration of hands holding
financial documents, a calculator, and a pie chart`.

`--recheck` re-scores the stored markdown without spending credits; `--force`
re-parses. Scoring changed after the first run, and re-parsing to fix a *metric*
would be waste.

### The markdown is the reference, the text is derived

An earlier run stored LlamaParse's `text` expansion instead, and it failed in a
way worth recording. On `110b25ca` p9 — a two-column glossary — the text
expansion interleaves the columns line by line:

> `Aire Métropolitaine : saisonniers, conjoncturels, et les chocs Elle contient les villes de Port-au-Prince, qui affectent les composantes du panier…`

The **markdown** of the same page reads it correctly — left column, then right,
with the definition that runs from the foot of one column into the head of the
other joined as a sentence:

> `Inflation sous-jacente : Tendance de long terme des prix, tout en excluant la volatilité, les mouvements saisonniers, conjoncturels, et les chocs qui affectent les composantes du panier considéré.`

An earlier draft of this file blamed LlamaParse for a column merge across all 8
content pages of that document. That was **our artifact, not its error** — the
blame belonged to the expansion we chose. Check the expansion before blaming the
parser, and keep one source of truth.

### Two questions, scored separately

| Question | Metric | Pass | Verdict |
|---|---|---|---|
| Did it read the right words? | word F1 vs the PDF's own text layer, **order-insensitive** | ≥ 0.98 | `verified` / `review` |
| Is the text in the right order? | **word** error rate on the word sequence | ≤ 0.10 | `ok` / `broken` |

Why WER and not character CER: the markdown rewraps lines and promotes headings,
so a character distance charges it for layout a second time. On `63b4ca02` p2 —
a table of contents — naive CER was **0.405**, almost all of it dot leaders the
markdown correctly replaced with a real table; the WER is **0.016**.

Two classes are excluded from the order score **by construction**:

- **tables** (`has_table`) — the text layer serializes a table column-major (all
  row labels, then all values), the markdown row-major. Same words, different
  order; calling either wrong is arbitrary. Table pages are verified on content.
- **charts and figures** (`semantic`) — the markdown is more than a transcription.
  A chart rebuilt as a data table carries 1.6–2.4× the text layer's word count,
  so scoring it as a transcription punishes the better output.

| | Result |
|---|---|
| content `verified` | **7** pages |
| content `review` | **7** pages — `110b25ca` p2, p3, p4, p7, p8, p9 and `63b4ca02` p5 (F1 0.899–0.979) |
| content `semantic` | **4** pages — charts and figures |
| content `unverified` | **9** pages — every scan |
| order `ok` | **4** pages |
| order n/a | **23** pages — scans, tables, charts |

### What this means for the benchmark

The reference is LlamaParse's markdown, adopted after review. It is a *semantic*
reference — it restructures, so it is not a character-level transcription and
must not be scored as one.

- For **born-digital pages** the PDF text layer stays an independent content
  check, which is what the `review` flags are: words carried over, but not all
  of them. Six of the seven are in `110b25ca` and sit at F1 0.899–0.979; read
  them before trusting a number that leans on them.
- For **scans** there is still nothing to check against. Those 9 pages are OCR
  taken on faith, and a result that includes them is partly measuring LlamaParse
  against itself. They need human transcription before they are gold.


## The dataset

`dataset.jsonl` is the deliverable: **27 rows, one per page**, derived from the
reference and rebuilt deterministically.

```json
{"id": "110b25ca-p009", "document": "<sha256>", "page": 9,
 "splits": ["eval"], "class": "digital/text-only", "status": "review",
 "reading_order": "ok", "has_table": false,
 "source": {"pdf": "documents/<sha256>.pdf", "page": 9},
 "reference_md": "…", "reference_txt": "…",
 "metrics": {"content_f1": 0.969, "order_wer": 0.065, "expansion_ratio": 1.05},
 "provenance": {"tier": "agentic", "version": "latest", "job_id": "…", "credits": 180.0}}
```

To run an engine: render `source.pdf` page `page`, compare its output to
`reference_txt` — `reference_md` is there for structure and table scoring. Each
row carries the exact parse that produced it, because a benchmark number is only
reproducible with the same reference.

`build_dataset.py --check` fails if the file no longer matches the reference, so
the committed dataset cannot silently drift from the committed transcriptions.

## Coverage: 8 of 13 classes

| Class | Covered |
|---|---|
| `scan/bad` · `scan/ok` · `scan/good` | yes — 1, 2 and 1 documents |
| `digital/text-only` | yes — 2 documents |
| `digital/table` | yes — 3 documents |
| `digital/2col` · `digital/figure` · `digital/table+2col` | yes — 1–2 each |
| `blank` | **no** |
| `digital/cover` | **no** |
| `digital/table+figure` | **no** |
| `digital/figure+2col` | **no** |
| `digital/table+figure+2col` | **no** |

**Three documents would close all five gaps**, because each covers several
classes at once — 38 pages, 2.5 MB, taking the set to 9 documents, 65 pages and
full coverage:

| Document | Pages | Size | Closes |
|---|---|---|---|
| `1d275de7` | 12 | 937 kB | `blank`, `digital/cover` |
| `ee8e0a16` | 12 | 747 kB | `blank`, `digital/figure+2col` |
| `a9e44cba` | 14 | 796 kB | `digital/table+figure`, `digital/table+figure+2col` |

Note what this does *not* fix: the set spans 2018, 2022, 2023 and 2026, so five
publication years are absent. That is a weaker kind of diversity than class
coverage — nothing about OCR performance is year-specific — but it is worth
knowing before publishing a result from this set.

## What code cannot see, and what was checked by eye

**A scanned page has no text and no vector lines, so nothing can classify its
content.** Scans are labelled by *format × resolution* only. Reading a contact
sheet of the candidates confirmed what the corpus holds:

- the scans are **letter-style administrative circulars** (*95-1 Déclaration de
  provenance de fonds*) and cleaner 2022 circulars (`Circulaire 122-pdf`), plus,
  at 300 dpi, a *designed colour cover* — navy field, BRH logo, line-art;
- the `digital/table` documents hold real numeric tables (`f31dfee9` is a wide
  multi-column financial table);
- **no scanned page with a data table has been found.** "scan + table" is a class
  this corpus sample does not supply, and a result should say so rather than
  imply coverage.

The content labels are heuristics even after tightening — `find_tables()` was
firing on covers and chart grids (58 of 275 pages, since fixed). Two known
residues in earlier drafts, `06681c1c` and `4ea455ca`, read `text-only` while
holding a small borderless table. **Confirm and correct a page's class while
transcribing it** — for a scan that is the only moment its content is ever known.

## One label worth remembering

`blank` means no text layer **and** no raster image: a genuinely blank page
(`bul37` has five; `67373c6b` p13 holds two characters). It is a real class, not a
failed scan — ingestion must not chunk it or cite it.

## Files

| File | Job |
|---|---|
| `documents/*.pdf` | the evaluation set, chosen by hand |
| `manifest.json` | generated: `selection`, `coverage`, `eval`, `ci` |
| `reference/<sha256>.md` | the reference, one file per document, with page markers |
| `reference/<sha256>.txt` | derived from the markdown — the scoring surface |
| `reference.json` | generated: provenance, per-page scores, credits |
| `dataset.jsonl` | generated: the dataset, one row per page |
| `build_reference.py` | parses `documents/` with LlamaParse and scores it |
| `build_dataset.py` | `reference/` → `dataset.jsonl` (`--check` for drift) |
| `candidates.json` | generated: the 22-document machine shortlist |
| `page-profiles.json` | the per-page profile of all 1 192 sample pages |
| `profile_pages.py` | rebuilds `page-profiles.json` from the corpus (needs `data/raw/web` + Postgres) |
| `select_documents.py` | the machine shortlist → `candidates.json` |
| `build_manifest.py` | verifies `documents/` → `manifest.json` |
| `contact_sheet.py` | renders documents for eyeballing |

`page-profiles.json` is committed because `data/raw/web/` is gitignored: without
it, `build_manifest.py` would need the whole 116-document corpus to say anything
about six files. With it, **`manifest.json` is reproducible from a checkout**
using just `documents/`.

Run them from the **repository root** — they import `brh_core`, which only the
workspace virtualenv resolves. `experiments/` is deliberately outside the uv
workspace (`AGENTS.md`), which is also why ruff does not lint them.

```bash
uv run python experiments/gold/build_manifest.py   # needs only this folder
uv run python experiments/gold/contact_sheet.py    # 1 = a later page of each

# the reference and the dataset (build_dataset runs offline; build_reference
# needs LLAMA_CLOUD_API_KEY and spends credits, --recheck does not)
uv run python experiments/gold/build_reference.py --recheck
uv run python experiments/gold/build_dataset.py --check

# only to rebuild the shortlist or the profiles from the corpus (slow, needs Postgres)
uv run python experiments/gold/select_documents.py
uv run python experiments/gold/profile_pages.py
```
