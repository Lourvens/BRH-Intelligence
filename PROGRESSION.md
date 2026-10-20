# Progression

Last updated: 2026-10-20 (corpus analytics family)

Working state of BRH Intelligence. **Read at session start.** Update when you
start, finish, or pivot a task, and when a non-obvious learning surfaces.

## Active

- **OCR extraction is in progress across three runners (2026-10-20).** The
  catalogue is 1 169 PDFs; **357 are extracted** (30.5%), 812 remain. The
  checkout is the whole corpus: the Modal volume was pulled with
  `modal volume get brh-ocr /ocr` and merged, so 173 documents that existed
  only on the volume are now committed (5 482 pages).
  - Modal is **stopped by budget**: $25.45 of the $30 credit is spent and the
    spend guard refuses to dispatch below $5. The last run was left to finish;
    no further Modal work is planned without new credit. A volume is not a
    backup: pull it before the credit runs out, not after.
  - Kaggle (`brh-ocr-batch`, two T4s) and Colab carry the rest for free.
    Kaggle does ~78 documents per kernel version; Colab runs 12-document chunks
    with a 3-minute pull loop, and each document gets its own process under a
    40-minute cap (a single hung document stalled two chunks).
  - Skip lists are the union of the volume and the checkout
    (`scripts/modal_ocr.py::export_done`); a document is skipped before
    download when its URL is mapped, after hashing otherwise.
  - Cost tracks characters per page (r 0,67), not document length: 22.6 s/page
    on average, 136.8 at the worst. Dense tables dominate.
  - Per-page rates: L4 $0.0019, T4 $0.0019, A100-80GB $0.0083. The PaddlePaddle
    backend measured 4.6x slower than transformers on a T4 and is not used.

- **Citation deep links are implemented** — `brh_core.citations` now builds
  `pdf_url`s (`…/slug.pdf#page=N`), collapses snippets, and assembles citations
  from retrieved chunks; offline tests cover the contract. The assistant source
  inspector and message source list open `pdfUrl` in a new tab and copy it with
  the citation.
- **BRH inventory (front half) is implemented** — `make inventory` catalogues
  every PDF on `brh.ht` (the ledger lists the whole corpus, pending or resolved)
  and downloads the missing ones content-addressed into `data/raw/web/`.
  Idempotent: the download queue is the unresolved rows, so bounded runs advance
  and failures are retried.
- **The rest of the repo is still a scaffold**: structure, contracts, config, and
  wiring only. See the build order in [`README.md`](README.md).
- **A second track, `services/analytics`**, generates the stats, charts and
  social-media assets. Its `inventory` family draws from the crawl ledger (six
  posts); its `corpus` family now draws from the extraction records and the
  per-page profile (eight posts). Both render from `python -m brh_analytics`.
- **A third track, OCR evaluation, is mid-phase 1.** The plan is
  `docs/plans/2026-10-15-ocr-evaluation-design.md`: corpus composition (measured),
  the engine landscape, the three scoring axes (quality / efficiency /
  reliability), and four phases — gold standard dataset → benchmark harness →
  ADR → CI regression gate. Phase 1a (the stratified corpus sample) is **done**,
  and phase 1b has **chosen** its documents — 6 picked by hand from a 22-document
  machine shortlist, 27 pages, in `experiments/gold/documents/`, with
  `build_manifest.py` adopting them and reporting that **5 of the 13 classes are
  uncovered**. Not transcribed yet. No OCR code exists.
- **The web landing page uses the new Stitch hero and sections (2026-10-19).**
  The hero is screen `b961ed14011a4dddb1cb2a19b9894f1d` (*Landing Page Hero
  Officiel*), and the sections below it are screen
  `027bffa8af21414d94f24317e0b8e889` (*Landing Page Complète Officielle*):
  four-step pipeline, corpus narrative + metrics + families + archive image,
  four use cases, sourced-search comparison, FAQ, access CTA and institutional
  footer. The navbar points at the new `#pipeline`, `#corpus`, `#usages`,
  `#comparatif` and `#faq` anchors. Components live in `components/home/*` and
  `components/home/hero/*`; the largest TS/TSX file is
  `assistant-shell.tsx` at 215 lines. The hero `Rejouer` and citation-copy
  controls are interactive. All live-index, guaranteed-accuracy, certification,
  40-year, confidence, latency and vault-style claims were replaced with the real
  1 169 PDFs / 34 transcribed documents / 1 192 profiled pages and the inflation
  note (28,3 %, p. 3).

- **The assistant shell is implemented at `/assistant` (2026-10-19).** Full
  three-panel workspace rebuilt from Stitch screen
  `81afab0033054e6d9c1f58636ea87fb8`: conversation rail, chat with empty state /
  composer / refusals, and a source rail. Assistant messages support inline
  numbered citations, source detail/copy, and generated **chart** and **graph**
  artifacts. Artifacts are schema-driven: `TableArtifact` + `UIDecision` select
  table, chart type (`line`, multi-line, `bar`, `area`, `pie`, `donut`,
  `scatter`) or graph; charts/graphs are derived from rows, and invalid decisions
  fall back to a semantic table. A collapsible decision card exposes the JSON
  decision. It currently runs on clearly marked local demo transcripts in
  `lib/chat/*`; `lib/agent.ts` wraps the real LangGraph `useStream` SDK and is the
  swap-in point for live messages/threads. `lib/chat/open-intelligent-ui.ts`
  records the hybrid A2UI/Open Generative UI routing contract; the CopilotKit
  runtime is not enabled yet. Auto-scroll pauses when the reader scrolls up. The
  landing header and closing CTA open `/assistant`.
  - The workspace now uses the shadcn `Sidebar` dashboard shell and `Sheet` for
    mobile sources. The left rail collapses to an icon rail; the right source
    inspector collapses to a 48px vertical rail (⌘/Ctrl+J). Charts and graphs
    open a shadcn `Dialog` focus mode from an **Agrandir** button. Charts are
    ECharts; graph artifacts detect trees (`lib/chat/graph.ts`), default trees to
    a Mermaid **Diagramme** and non-trees to **Réseau** (ECharts force graph).
    Long diagrams default to vertical (`TD`) with a vertical/horizontal toggle.
    A complex 8-node tree demo
    lives in `lib/chat/tree-artifact.ts` + `tree-demo.ts`; a true 8-node network
    with cycles lives in `lib/chat/network-artifact.ts`. The
    `showcase-multimessage` thread is a single conversation with area,
    multi-line, donut, bar, tree and network artifacts. Long-form answers use
    Source Serif 4 (`font-reading`), while UI text stays Inter and display
    headings stay Montserrat. The long-form demo `lib/chat/long-document.ts`
    exercises headings, paragraphs, quotes, lists, a table and citations.

## Next up

Continue the build order:

1. `embeddings/hashing.py` + `vectorstore/memory.py` — offline embedder and
   vector store, so tests can run with no cloud.
2. `db/repository.py` — corpus documents/pages/chunks read/write (pool and
   migrate are done; run `make postgres-up && make migrate`).
3. Ingestion: `metadata.py` → `extract.py` → `chunk.py` → `pipeline.py`, fed by
   the files the inventory has already downloaded. Verify with `make ingest`.

## Recently done

- **2026-10-20 — Corpus analytics family (`brh_analytics.corpus`).** The first
  stats over what OCR actually produced, not what the site lists. Sources:
  `data/ocr/<sha256>/meta.json` (182 documents, 2 215 pages, 5,6 M characters,
  160 figures, 13 h 53 of compute), `experiments/gold/page-profiles.json` (the
  116-document, 1 192-page per-page sample) and `corpus.crawl_urls` for coverage
  only. Eight findings: `couverture` (182/1 169 = 15,6 %), `reste` (1 053
  undownloaded, 480 from 2018), `volume` (seven 67-page documents hold 21,2 % of
  pages), `rythme` (22,6 s/page, p90 56,9, max 136,8), `queue` (11 documents
  >20 min, slowest 32 min 20 s), and three sample posts — `pages` (336 scanned
  pages, 28,2 %), `hybride` (20 mixed documents hiding 94 scanned pages) and
  `tableaux` (217 pages with tables, none scanned).
  - Measured, not estimated: the mean is **22,6 s/page** (not the earlier
    8,7 s/page figure), and the cost correlates with characters per page
    (r≈0,67), not document length. `pages` is the first chart to label a share
    per year, via a new `formatter` hook on `charts.per_year`; `charts.histogram`
    is the new distribution primitive. Neither adds a colour.
  - The 182 is local and verifiable: `state.jsonl` replays to the same set once
    duplicate `done` events are collapsed (201 events → 182 shas). Remote volume
    documents are not counted. The catalogue records only 116 downloads because
    the OCR batches fetch PDFs outside the inventory; the `couverture` caption
    says so rather than pretending the two agree.
  - Postgres is optional here: a failed catalogue read warns and drops only the
    two coverage posts. `tests/test_corpus.py` (22 offline cases) and
    `tests/test_formatting.py` (4) pass with no services.

- **2026-10-20 — Assistant libraries: ECharts, shadcn dashboard, Mermaid graphs,
  reading typography.** Migrated the chart renderer from hand-rolled SVG to
  ECharts (line, multi-line, area, bar, pie, donut, scatter) and removed
  `cartesian-chart.tsx` / `pie-artifact.tsx`. Rebuilt the assistant shell around
  shadcn `Sidebar`/`SidebarInset` and `Sheet`, and moved buttons, tabs, cards,
  inputs, badges and tooltips to shadcn primitives. Graph artifacts now render
  two views: a draggable/zoomable ECharts `graph` network and a lazy-loaded
  Mermaid flowchart, using the same table-derived nodes/edges. Added a long-form
  demo document (`lib/chat/long-document.ts`) with headings, paragraphs,
  blockquotes, lists, a table, links and citations, and a real Markdown renderer
  (`react-markdown` + GFM). Long-form reading now uses self-hosted **Source
  Serif 4** (`font-reading`); Inter remains the UI face and Montserrat the
  display face. Collapsible rails were explored in Stitch screen
  `1dcc653cdff9474297b37ef2d5d12c99`, and focus-mode UI was explored in the
  same project. The network view uses free circular nodes in a force layout,
  while the diagram view uses Mermaid boxes and can switch between vertical and
  horizontal orientation. A multi-message showcase thread covers area,
  multi-line, donut, bar, tree and network artifacts. `bun run typecheck` and
  `bun run build` pass.
- **2026-10-19 — Assistant workspace rebuilt from Stitch.** Generated screen
  `81afab0033054e6d9c1f58636ea87fb8` (*Assistant Documentaire Chat Workspace*)
  and rebuilt `/assistant` against it: 280px conversation rail, 56px contextual
  header, 320px source inspector, long-form answer with inline citation,
  multi-line chart with peak callout, source provenance, collapsed JSON decision
  card, and responsive drawers. The answer copy was expanded to three factual
  BIC sequences. Replaced the Stitch copy’s “certified/statutaire/confidence”
  claims with “Réponse sourcée” and no confidence score. Added a mock chart
  gallery (area/pie/bar), multi-line BIC consultations, donut agencies, and the
  existing graph/table/line examples. Chart renderer now supports line,
  multi-series line, bar, area, pie, donut and scatter from table schemas.
  `bun run typecheck` and `bun run build` pass; desktop 1440 and mobile 390
  checked with `agent-browser`.

- **2026-10-19 — Assistant chat UI created at `/assistant`.** Full app shell:
  conversation history rail, chat panel with empty state, suggestions, composer,
  stop state and refusal card; source rail with citation detail/copy; mobile
  drawers. Assistant messages support inline source markers plus generated
  **chart** and **graph** artifacts. Artifacts use a table schema + JSON
  `UIDecision` contract (`lib/chat/decision.ts`): the decision chooses table,
  chart type (line, multi-line, bar, area, pie, donut, scatter) or graph;
  charts/graphs derive from rows, and invalid decisions fall back to a table.
  Added a demo gallery thread covering area, pie and bar next to the line,
  multi-line and donut examples. Added the hybrid Open Intelligent UI routing
  contract (`lib/chat/open-intelligent-ui.ts`): table → A2UI, chart/graph → Open
  Generative UI, disabled by default. The page runs on local demo transcripts in
  `lib/chat/*` (clearly marked “Démo”); `lib/agent.ts` wraps the LangGraph
  `useStream` hook. Landing header and closing CTA link to the new page. Added
  design notes in `docs/plans/2026-10-19-agent-chat-ui-design.md`. Every TS/TSX
  file stays under 250 lines (`assistant-shell.tsx` is largest at 215).
  `bun run typecheck` and `bun run build` pass; 1440px and 390px checked with
  `agent-browser`, including chart/graph artifacts and source drawers.

- **2026-10-19 — Rest sections rebuilt from Stitch.** Replaced the previous
  corpus/questions/method/limits/CTA/footer stack with screen
  `027bffa8af21414d94f24317e0b8e889` (project `14932998564978548471`): four-step
  pipeline, corpus narrative + real metrics + three document families + archive
  image, four professional use cases, a sourced-search comparison table (with a
  mobile card fallback), four-item FAQ, access CTA and a five-column footer. The
  navbar now points at `#pipeline`, `#corpus`, `#usages`, `#comparatif` and
  `#faq`. Removed Stitch’s unfounded precision, certification, legal-value,
  40-year, 24/7, live-index, confidence/latency, integrity and fake institutional
  endorsement claims; the copy uses 1 169 PDFs, 34 transcribed documents, 1 192
  profiled pages and the 2018—2026 sample. Deleted the superseded
  chart/questions/method/limits components. `bun run typecheck` and
  `bun run build` pass; 1440px and 390px layouts plus the mobile comparison
  cards checked with `agent-browser`.

- **2026-10-19 — New Stitch hero implemented.** Replaced the previous hero with
  screen `b961ed14011a4dddb1cb2a19b9894f1d` (*Landing Page Hero Officiel*,
  project `14932998564978548471`). The new hero has the large gradient headline,
  corpus CTAs, a browser-framed product showcase (query bar, three grounding
  steps, sourced answer + document inspector), archive strip, corpus trust tags
  and three real metrics. Replaced the Stitch copy’s live/guaranteed claims with
  the inflation note (`28,3 %`, p. 3), 1 169 PDFs, 34 transcribed documents and
  1 192 profiled pages; removed the reference’s unfounded trust badges,
  confidence/latency figures, the 40-year claim and fake institutional
  endorsements. Added `Rejouer` and citation-copy interactions. Removed the
  now-unused vault image. Largest TS/TSX file: `hero-showcase.tsx` at 180 lines.
  `bun run typecheck` and `bun run build` pass; 1440px and 390px layouts checked
  with `agent-browser`.

- **2026-10-19 — Stitch landing page completed.** Implemented the remaining
  sections of screen `296a96a976eb48cdb85d9cc1277275c0` (project
  `14932998564978548471`): corpus archive + inflation SVG chart + sourced
  excerpt + taxonomy + metrics; four example questions; dark method section with
  retrieval/refusal diagram and architecture notes; explicit perimeter; closing
  CTA; navy footer. Added `public/brh-corpus-archive.jpg`, shared
  `lib/content/navigation.ts` and `components/home/section-heading.tsx`.
  Corrected Stitch overclaims again: “exhaustive/indexed”, “certified”,
  “guaranteed accuracy”, confidence/latency figures and fake retrieval scores are
  gone; the page uses 1 169 PDFs, 34 transcribed documents, 1 192 profiled pages
  and the real 2018—2026 sample. Every TS/TSX file stays under 250 lines.
  `bun run typecheck` and `bun run build` pass; desktop anchor navigation and
  390px layouts checked in `agent-browser` (including the chart labels and mobile
  stacking).

- **2026-10-19 — Stitch navbar + hero implemented.** Started from the blank
  canvas and rebuilt the top of the page from screen
  `296a96a976eb48cdb85d9cc1277275c0` (project `14932998564978548471`). The
  sticky navbar uses the real BRH logo and the reference’s status/CTA layout.
  The hero mirrors the Stitch HTML: centred badge and headline, filter/search
  card, 5/7 split with a locally hosted archive image and a dark agent console,
  then the four trust cards. Real corpus content: inflation `28,3 %` (p. 3),
  BRH creation `17 août 1979` (p. 5), BIC `avril 2013` (p. 5), 34 transcribed
  documents and 1 192 profiled pages. Removed the reference’s fabricated
  confidence/latency/perfect-coverage copy. Components split
  under `components/home/hero/*`; every TS/TSX file is under 250 lines.
  `bun run typecheck` and `bun run build` pass; desktop and 390px layouts checked
  with `agent-browser`, including filter, quick-example and CTA interactions.

- **2026-10-19 — Landing page reset to a blank canvas.** The prior
  Stitch/Aceternity implementation was deleted rather than layered over: all
  `components/home`, `components/illustrations`, site chrome (`site-header`,
  `site-footer`, `mobile-nav`, `brand`), landing motion helpers, `lib/content`,
  and the old landing-only UI primitives are gone. `app/page.tsx` is an empty
  `<main>`; `globals.css` keeps the design tokens/fonts/base styles and drops
  the hero-grid utilities. `bun run typecheck` and `bun run build` pass; the
  blank page was checked in `agent-browser`. Next: implement the next Stitch
  reference one section at a time.

- **2026-10-19 — Stitch-led landing redesign, and the file-size split.**
  Stitch project `14932998564978548471` (design system
  `assets/9aec97cf64f84d10aadabea4bce0f6c6`) produced a desktop screen
  (`…/screens/401097e628ce48af966647703191c905`) and a 390px mobile screen
  (`…/screens/8b717e14e701499da428e788e1ccc756`). The React implementation keeps
  the same editorial navy/azure/gold system but adds Aceternity-style
  spotlight/beams, a bento corpus grid, animated counters and a dark pipeline.
  The hero is now `components/home/hero.tsx` plus
  `hero/{agent-console,sourced-answer,source-document,query-presets,hero-trust}`;
  content is split across `lib/content/{hero,corpus,questions,method,closing}.ts`.
  **Every TS/TSX file is under 250 lines** (largest: `interactive-pipeline.tsx`,
  242). Marketing claims were corrected: no “RAG en ligne”, “confiance 99,4 %”,
  “100 % citations vérifiées” or “Tesseract” — the header says
  “Archive 2018—2026”, the metrics use 34 transcribed documents, and the OCR
  visual says PaddleOCR-VL. `bun run typecheck` and `bun run build` pass; desktop
  and mobile checked with `agent-browser`.
- **2026-10-19 — Web design system and welcome page.** `apps/web/app/globals.css`
  is now the web port of the analytics style guide: brand and neutral tokens,
  the `11 · 12 · 14 · 16 · 20 · 24 · 32 · 44 · 64` type scale, card radius and
  shadows. Montserrat and Inter are **self-hosted** (`app/fonts/*.woff2`,
  latin subset) through `next/font/local`, so the build needs no network and
  French accents are covered. `lib/utils.ts` extends `tailwind-merge` with the
  named scale — without it, `text-caption` and `text-white` collide and navy
  buttons lose their label (caught in a headless screenshot, not by `tsc`).
  New primitives: `Brand` (original 251×123 mark, never recoloured),
  `Button`/`ButtonLink` (primary, secondary, ghost, gold-fill), `CitationChip`,
  `SiteHeader`, `SiteFooter`, and `AnswerPreview`. The page itself is
  `app/page.tsx`: hero, corpus band, three-step method, navy CTA, footer.
  The preview cites **RDCCF Vol. V (juin 2026), p. 19 and p. 23** — real
  sections of a document already in `data/processed`. Copy is deliberately
  provisional. `bun run build` passes; desktop (1440) and mobile (390) checked
  with Chrome headless.
- **2026-10-18 — Full-corpus OCR batch started on Kaggle.**
  Corpus profile: **116 documents, 1 192 pages, 127 MiB** — 336 scanned pages
  (28%), 217 with tables, 72 with figures; 72 born-digital / 20 hybrid / 24 fully
  scanned; years 2018–2026. At the measured **14.9 s/page** (T4, charts on) the
  batch is **~4.9 h**.
  Kaggle turned out to be the better host than Colab: **12 h sessions, 29 GB RAM,
  T4 ×2, 30 GPU h/week**, driven headlessly with `kaggle kernels push`
  (CLI 2.2.4, `KGAT_…` token). Private dataset `lourvensluxamar/brh-ocr-code`
  holds `brh_core` + `urls.json`; kernel `lourvensluxamar/brh-ocr-batch`
  installs the OCR stack, downloads the 116 PDFs from brh.ht with `sha256`
  verification, builds the manifest, runs the batch, and zips the output to
  `/kaggle/working`. State lives in `/kaggle/working/ocr/state.jsonl` and is
  saved as kernel output, so a re-push resumes rather than restarts.
- **2026-10-18 — Batch OCR is production code now, not an experiment.**
  `brh_core.ingestion.ocr` (manifest → ledger → per-document output) +
  `brh_core.ingestion.engines` (PaddleOCR-VL behind a `parse()` protocol, heavy
  import deferred) + `brh_core.ingestion.markdown` (markup normaliser).
  **Resumable by construction:** `manifest.jsonl` keys documents by `sha256`;
  `state.jsonl` is append-only (`started`/`done`/`failed`, every event carrying
  batch id and attempt); status is a replay, never a second field that can drift.
  `done` skips, `--retry-failed` retries, `--max-attempts` marks exhausted,
  `--force` redoes. A failed document never leaves a half-written `document.md`
  (staged + atomic replace). Output: `<out>/<sha>/document.md` with
  `<!-- page N -->`, `assets/pNNN/`, `meta.json`. CLI:
  `python -m brh_core.ingestion.ocr {manifest,run,status}`.
  `scripts/colab-ocr.sh` runs the whole thing on a Colab VM: installs the OCR
  stack, puts `brh_core` on `PYTHONPATH` (no Postgres/Pinecone), builds the
  manifest, runs, prints status. **`brh_core/ingestion/__init__` is now lazy** —
  importing the OCR runner used to pull psycopg and psycopg_pool through
  `pipeline`, which defeated "runs anywhere"; verified: zero heavy modules.
  Tests: `packages/core/tests/test_ocr_batch.py`, 10 offline cases against a fake
  engine (skip-done, retry, exhaustion, limit, missing source, atomicity, cleaning).
  Spec: `docs/architecture/ocr-batch.md`.
- **2026-10-18 — PaddleOCR-VL output layout, settled.** The pipeline writes one
  directory per page (`raw/pages/<sha>/pNNN/`) holding `<sha>_N.md` — **N is a
  0-based page index**, so `p001` holds `_0.md`; the directory is the page number
  — plus `imgs/` with the Figure crops named by box. Those `imgs/…` paths are
  relative to the page directory, so they are **dead in the merged document**
  (14 references across the six files). `clean.py` now copies them to
  `clean/assets/<sha>/pNNN/` and rewrites them as `![](assets/…)`: 14 figures,
  0 broken links, 888 kB, and the output directory is self-contained.
  Tables: 5 stay HTML because their rows have different cell counts (no merged
  cells in this set) — padding them would shift values by a column, so only the
  styling is dropped. `--drop-images` is there for a text-only corpus.
- **2026-10-18 — PaddleOCR-VL chosen; clean output and charts.** Two fixes on top
  of the run. **(1) Markup.** PaddleOCR writes HTML tables with a style attribute
  on every cell and `<div style=…>` around captions — `paddleocr/clean.py` turns
  simple tables into GFM pipe tables, strips every attribute from the rest,
  unwraps divs and unescapes entities: **68 948 → 40 452 chars (59%)**, tags
  1 455 → 897. The wide table now looks exactly like LlamaParse's.
  **(2) Charts.** `use_chart_recognition=True` (off by default) reads a chart as
  data: `63b4ca02` p7 returns 20 rows of `Date | Infl_m | Infl_y`. F1 on the chart
  pages rises 0.340 → 0.428 and 0.646 → 0.754; a non-chart page is unchanged
  (0.996). WER rises on chart pages because the recovered series is text the
  text layer never had — chart pages must be scored on series recovery, not WER.
  Cost: +34% time and +60% output on `110b25ca`. Chosen config:
  `PaddleOCRVL(engine="transformers", use_chart_recognition=True)` + `clean.py`.
  Colab reclaimed a VM mid-run once; the chart pass was re-run on the two
  chart-bearing documents only (19 pages, 64 504 chars, 311 s).
- **2026-10-18 — OCR candidate 3: PaddleOCR-VL 0.9B, and a scoring bug worth
  remembering.** `experiments/paddleocr/` holds the run (Colab T4, PaddleOCR 3.7.0,
  `PaddleOCRVL(engine="transformers")` so torch does the work and no Paddle GPU
  wheel is needed): **6/6 documents, 68 948 chars, 401 s** — the slowest, ~15 s/page,
  and the most verbose (HTML tables). Four-way on the 18 born-digital pages:
  **MinerU 0.907 / PaddleOCR-VL 0.906 / Docling 0.895 / LlamaParse 0.885**; F1 ≥
  0.98 is 10 / 10 / **11** / 7; WER ≤ 0.10 is 8 / 8 / **9** / 8. On the scan it
  reads the body cleanly (unlike Docling) but drops the letterhead like MinerU.
  **The bug:** PaddleOCR emits HTML tables with `style='text-align: center;
  word-wrap: break-word;'` on every cell, and `markdown_to_text` does not strip
  tags — every cell's style text entered the word counts, WER hit 4.0 and the
  engine scored 0.660. `compare_ocr.py` now strips tags for *all* engines, which
  is why Docling's numbers moved from 0.890/10/8 to 0.895/11/9. Score the text,
  not the markup.
  Context: PaddleOCR-VL-1.5 is SOTA on OmniDocBench v1.5 (94.5% vs MinerU2.5's
  90.67%), yet here it is level with MinerU — that benchmark is mostly Chinese and
  English and weights formulas/tables, this corpus is French, table-heavy and
  partly scanned.
- **2026-10-18 — OCR candidate 2: Docling 2.140.0, and a correction to MinerU.**
  `experiments/docling/` holds the run (Colab T4, `do_ocr`, tables, EasyOCR
  `lang=["fr"]`): **6/6 documents, 46 268 chars, 71.8 s**, and it keeps page
  breaks via `page_break_placeholder` — MinerU cannot. Three-way on the 18
  born-digital pages (`experiments/compare_ocr.py`): **LlamaParse 0.885 / 7 pages
  ≥0.98, MinerU 0.907 / 10, Docling 0.890 / 10**; WER ≤ 0.10 is 8 each. Docling
  wins nothing structural but matches MinerU on the wide table (1.000 / 0.000)
  and loses on charts (0.351 vs 0.364 vs LlamaParse 0.483).
  **The scan is the split:** on `f2d799b9` Docling drops the letterhead *and*
  mis-reads the body (`déclarntions`, `circulairc`, `trnnsfert`, `Gdes 5,000.9`),
  while MinerU reads it cleanly.
  **Correction:** MinerU *did* capture `CIRCULAIRE No 95-1A` — it types the
  letterhead as `header` and the footer as `footer`, and its **markdown writer
  omits both**, so only `raw/<sha>.json` has them. For page-level citations,
  render from the page tree, not the markdown. Gotcha: Docling 2.x no longer
  bundles EasyOCR (`ImportError` on every file until `pip install easyocr`).
- **2026-10-18 — OCR candidate 1: MinerU 4.0.12, run for real on a Colab T4.**
  `experiments/mineru/` holds the run: **27 pages, 37 503 chars, 138 s**, tier
  `standard` (small models + VLM), `ocr_mode="auto"`, 6/6 documents. Scored the
  same way as the reference: **mean word F1 0.907 vs LlamaParse's 0.885**, pages
  at F1 ≥ 0.98 **10 vs 7**, WER ≤ 0.10 **8 vs 8**. It is *perfect* on the wide
  financial table (`f31dfee9`: 1.000 F1, 0.000 WER) and cleaner on the two-column
  glossary (`110b25ca` p9: 0.997/0.006 vs 0.969/0.065). Charts beat both: 0.364
  vs 0.483 on `63b4ca02` p7, 0.611 vs 0.564 on `110b25ca` p6 — neither is a
  transcription there.
  Two gotchas cost real time, both recorded in the README: **Colab ships Python
  3.13 and vLLM has no wheels for it** (the install "hangs" building from source —
  use a 3.12 venv), and **vLLM spawns its engine core, so entry scripts need
  `if __name__ == "__main__":`** or the child re-runs the parse. Also MinerU
  inlines page images as base64 in the markdown; `run.py` collapses them.
  `mineru/score.py` reproduces the comparison; no API key, no cost.
  Colab was driven headlessly with `google-colab-cli` (`colab new/exec/download/stop`),
  which needs a one-time OAuth code — `OAUTHLIB_RELAX_TOKEN_SCOPE=1` was required
  because the granted scope set omits `cloud-platform`. HF Jobs was tried as a
  fallback and refused a fine-grained token (`403` on the jobs-artifacts bucket).
- **2026-10-17 — OCR candidates: MinerU first (notebook).**
  `experiments/notebooks/0003-mineru-ocr.ipynb` runs **MinerU 4.0** on Colab (T4)
  over the six benchmark PDFs. MinerU 4 renamed everything — no `magic-pdf`, no
  `-b pipeline`, extras are `torch`/`full` — so the notebook uses
  `mineru.parser.parse(path, tier=..., ocr_mode=...)`. Settings: `tier="standard"`
  (small models + VLM), `ocr_mode="auto"` (text layer where present, OCR where
  not). **There is no `fr` language code**: `ch` is the model that covers Latin,
  and `-l/--lang` only applies to the legacy `pipeline` backend, so `standard`
  ignores it and `fr` raises `ValueError`. Inputs are downloaded from brh.ht and
  verified by `sha256` (all six URLs return the exact manifest byte counts), so
  the run needs no upload. Smoke test is `110b25ca` p9 (the two-column glossary)
  before the full run; output is `.md` + `.json` per document plus `results.json`.
  Not yet executed on Colab.
- **2026-10-17 — The reference and the dataset (phase 1b, continued).**
  `experiments/gold/reference/<sha256>.md` holds the reference **per document**
  (not per page), with `<!-- page N -->` markers so citations stay page-level;
  `.txt` is derived from it, so the two cannot disagree. Built by
  `build_reference.py`: **27 pages, 39 323 characters, 390 credits**, tier
  `agentic`, French OCR, and — from the sibling's `llamaparse` skill —
  `specialized_chart_parsing: "agentic"`, which returns a chart as a **data
  table** instead of axis labels, and describes figures.
  **Correction to an earlier claim:** LlamaParse's `text` expansion does merge
  `110b25ca` p9's columns line by line, but its **markdown reads them correctly**
  (`Inflation sous-jacente … les mouvements saisonniers, conjoncturels, et les
  chocs …`). The column failure was our choice of expansion, not its error, and
  the first version of the README blamed the wrong party. Scoring is now word F1
  (content) + **WER** (order) against the PDF text layer: WER, not CER, because
  markdown rewraps lines and promotes headings (TOC page: CER 0.405 vs WER 0.016).
  Tables are excluded from the order score (text layer is column-major, markdown
  row-major) and chart/figure pages are marked `semantic` (1.6–2.4× the word
  count — richer than a transcription). Result: content `verified` 7, `review` 7,
  `semantic` 4, `unverified` 9; order `ok` 4, n/a 23.
  **`experiments/gold/dataset.jsonl`** is now the deliverable: 27 rows, one per
  page, with `source.pdf`+`page`, `reference_md`/`reference_txt`, class, status
  and the exact parse provenance. `build_dataset.py --check` fails if it drifts
  from the reference. `build_reference.py` has `--recheck` (re-score from the
  stored markdown, no credits) and `--force` (re-parse). Needs
  `LLAMA_CLOUD_API_KEY`; `llama-cloud` is an `experiments/` dependency.
- **2026-10-16 — Benchmark document set (phase 1b).** Profiled all **1 192 pages**
  of the corpus sample, then shortlisted **22 whole documents (141 pages)** covering
  every technical class present — `digital`/`scan` × resolution × content
  (`text-only`, `table`, `figure`, `2col`, `cover`), plus `blank`. A human then
  picked **6 documents (27 pages, 4.1 MB)** from that shortlist as the evaluation
  set; `build_manifest.py` verifies each file against its own `sha256` and derives
  the classes it covers. The pick is lean — a third of the shortlist's pages — and
  **misses 5 classes**, which the manifest reports on every run instead of
  filling. Note: adding `1d275de7`, `ee8e0a16` and `a9e44cba`
  (38 pages, 2.5 MB) would close all five.
  **Selection is per document, not per page**: a benchmark entry is a file, and
  page-level selection had hidden that 11 documents are *hybrid*. Learned the hard
  way: size caps must be a pool filter (breadth-first greedy reached 424 pages /
  42 MB) and year coverage must be a goal, not a tie-break (2021 silently fell
  out). Rendering a contact sheet also showed `find_tables()` firing on covers and
  chart grids, and that **no scanned page with a data table exists** in the
  sample. Also corrected the OCR workload: **336 pages have no text layer
  (28.2%)**, not 242.

- **2026-10-15 — OCR evaluation research (phase 0), and the sample that corrected
  it (phase 1a).** The first pass measured the only 27 documents the backfill had
  reached: **78% born-digital / 19% image-only / 4% scan+text**, scans at
  **74–75 dpi**. That sample was biased — the queue orders `wp_modified ASC`, so
  25 of 28 resolved documents were 2018 circulars. `make inventory
  ARGS="--sample 90"` (10 documents per publication year; the selector is
  `pipeline.stratified_sample`) re-measured it over **116 documents / 1 192
  pages**: **75.9% born-digital, 20.7% image-only (242 pages need OCR), 3.4%
  suspect text layer**, scans at a **median 150 dpi, 96% below 300** — but *not*
  uniformly: 18 of the 24 scans sit in **2018 (11) and 2022 (7)**, 2021 and 2025
  have none, and two **2026** documents are scanned too. The 2022 set is a batch
  of `Circulaire 12x-pdf` scans. Also reviewed the engine landscape (OmniDocBench
  v1.7, olmOCR-Bench, a 22-engine four-track study), CPU throughput, licensing,
  and evaluation methodology — including that **ground-truth noise alone sets a
  4–7% CER floor**, which is why half of phase 1 is measuring our own
  transcription disagreement. Plan:
  `docs/plans/2026-10-15-ocr-evaluation-design.md`.
- **2026-10-15 — Analytics scope + BRH design guide.** `services/analytics`
  (`brh_analytics`, a new uv workspace member) opens the stats/charts/social
  track. The palette was sampled from `brh.ht` itself — the site logo is a flat
  `#031A71` navy, headings are Montserrat — then re-tuned where WCAG demanded
  it (gold stays a fill colour; `gold-ink` carries text). `palette.check()` is
  the machine-checkable contract, `python -m brh_analytics` renders
  `assets/palette.png` plus every post, and the rules live in
  `services/analytics/DESIGN.md`.
- **2026-10-15 — the inventory family, and the grouping.** Analytics is
  organised into *families*: a package per kind of analytics owning its source
  and its copy, with a shared, domain-free design layer (`palette`, `charts`,
  `finding`, `posts`) on top. `inventory` is the first — six findings from the
  crawl ledger (1 169 documents; the 2017-2018 migration masquerading as a
  publication spike; what the BRH publishes; the inflation note cadence; the
  job postings hidden in the media library; the 198 titles that arrive damaged)
  rendered to postable PNGs and browsable in a Streamlit dashboard. Output is
  grouped to match: `out/inventory/<slug>-<format>.png`.
- **2026-10-14 — BRH document inventory.** `brh_core.inventory`: discover PDFs
  via the WordPress media API, download into `data/raw/web/<sha256>.pdf`, log
  every URL in `corpus.crawl_urls` (dates + status + hash) with a run history in
  `corpus.crawl_runs`. Each run catalogues the whole site first, so the ledger
  lists every PDF whether or not it has been downloaded. Verified against the
  live site + Postgres; covered offline in
  `packages/core/tests/test_inventory.py`.
- **2026-10-14 — Scaffold.** Monorepo (uv workspace: `brh-core`, `brh-agent`,
  `brh-mcp`; bun workspace: `apps/web`). Real: config, domain model, SQL schema,
  `VectorStore`/`Embedder` protocols, graph wiring, MCP server shell, tooling,
  Make targets, 10 ADRs. Stubbed with `TODO`: all logic.
- **2026-10-14 — A full working implementation exists on the branch
  `reference/full-implementation`.** It was built first, then reduced to this
  scaffold at the author's request. Use it as a reference while implementing,
  or delete the branch (`git branch -D reference/full-implementation`) if you'd
  rather not have it.

## Backlog / out of scope for now

- Haitian Creole + English surfaces (docs are French-only for now).
- Indicator comparison / structured tables as a first-class query type.
- Session persistence + follow-up memory (LangGraph checkpointer on Postgres).
- Auth + rate limiting for the public MCP server.
- Serve source PDFs from object storage instead of through the web app.
- Evaluation harness (French Q/A over RDDCF, recall@k + groundedness).
- Reranker once we have retrieval failures to point at.

## Gotchas

- The sibling corpus (`brh-intelligence-queryengine/data/processed/*.md`) has
  **no page markers** (`pages: null` in its manifest). Do not rely on it for
  page-level citations — extract page-aware text from the PDFs yourself
  (ADR-0005). This is the single most important lesson carried over.
- Page numbers must be **1-based** and match the PDF viewer's `#page=N`.
- `langgraph dev` loads `langgraph.json`'s `env` file, which **overrides**
  exported shell env vars. To test against the offline backend, edit `.env`,
  not the shell.
- Pinecone's **records API** (`upsert_records` / `search_records`) is what
  integrated-inference indexes use; the plain `upsert`/`query` API needs
  client-computed vectors.
- `multilingual-e5-large` has a ~512-token (~2K char) ceiling; chunks above it
  are silently truncated at embed time. Keep `chunk_size` well under it
  (default 1000 chars).
- `brh.ht` is WordPress: enumerate documents through
  `wp-json/wp/v2/media?mime_type=application/pdf`, **not** `media_type=...`
  (that rejects `pdf` with HTTP 400 — the sibling project's doc is wrong).
  Incremental discovery is the `modified_after` parameter.
- `brh.ht` file responses carry `Last-Modified` + `Content-Length` but **no
  `ETag`**, so a cheap re-check is `(last_modified, content_length)`; the real
  identity is the `sha256` computed after download. The same bytes appear at
  more than one URL, so a file's URL is not its identity.
- The inventory's download queue is *derived*, not a stored cursor: it is the
  rows whose status is not resolved (`pending`/`failed`, ordered by
  `wp_modified`). So a bounded run advances, a failure is simply still queued,
  and a document that changes is re-queued (its `wp_modified` moves). Each run
  re-catalogues the whole site first, so the ledger always lists every URL.
- The catalogue stores each PDF's `title`, `slug`, `wp_id` and dates before it is
  downloaded. Its declared `filesize` (from `media_details`) is stored too — but
  only when WordPress has one; older attachments return `media_details: {}`, so
  their size stays unknown until the `HEAD` at download time. `--stats` reports
  `outstanding_sized` so the partial `outstanding_bytes` is not mistaken for the
  whole corpus.
- **The backfill consumes the oldest documents first.** The queue orders by
  `wp_modified ASC` (nulls first), so a plain `--limit` describes 2018 and
  nothing else. Use **`make inventory ARGS="--sample N"`** instead when you want
  to know what the corpus *contains*: it takes one document from every
  publication year in turn. This is not a nicety — the first 28-document read of
  the corpus missed that the scans are concentrated in two years.
- **This machine has no GPU** (8 vCPU, 15 GB RAM, no `nvidia-smi`). OCR
  candidates must be scored on CPU, or a GPU acquired deliberately — the whole
  candidate ladder depends on which.
- **Scans are low-resolution and unevenly distributed.** Over 116 documents:
  median **150 dpi**, 25% below 150, 96% below 300 (the literature assumes
  300–400). But they are concentrated — 2018 has 11, 2022 has 7 of the 24, and
  2021/2025 have none — and the 2022 set is a batch of `Circulaire 12x-pdf`
  scans. Two **2026** documents are scanned as well, so this is not a legacy
  problem. Upscaling/deskewing is a real experimental arm, not a detail.
- **Count pages, not documents.** 336 of 1 192 pages have no text layer (28.2%),
  but only 242 of those belong to the 24 wholly-scanned documents: **11 documents
  are hybrid**, carrying scanned pages among digital ones. A per-document verdict
  under-counts the work by a third, and means the ingestion router must decide
  **per page**, not per document.
- **Never trust a text layer you did not produce.** 4 of the 116 documents carry
  both a real text layer and ~full raster coverage — possibly a previous OCR of
  unknown quality. The ingestion router must verify such a layer, not trust it.
