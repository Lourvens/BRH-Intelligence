# Chunking evaluation — design

- **Date**: 2026-10-23
- **Status**: closed as an experiment. The strategy it informed is implemented
  as v1 in `brh_core.ingestion.chunking` and recorded in
  [`ADR-0011`](../adr/0011-chunking-strategy.md); the *evaluation* of that v1 is
  the open follow-up, not this notebook.
- **Feeds**: ADR-0011. Nothing in this plan was implemented directly — the
  notebook is evidence, and `experiments/` still ships nothing.

The ingestion pipeline's first irreversible choice is how a page becomes a
passage. Get it wrong and no embedder, reranker or prompt can recover: the
answer either is not in any chunk, or is buried in one that says six other
things. So the chunker is chosen by measurement over the real corpus, before
`chunk.py` is implemented.

## What the literature already settles

Searched 2026-10-23 (Exa + Context7 `/websites/langchain_oss`).

- **Recursive character splitting is the strong, cheap default.** Chroma's
  chunking study (2024, 5 corpora, `text-embedding-3-large`) measured
  `RecursiveCharacterTextSplitter` at 200 tokens / 0 overlap as the most
  consistently high performer: recall 88.1, PrecisionΩ 29.9, IoU 6.9 — within
  noise of the best semantic chunker's recall (91.9) at a fraction of the cost.
  Its verdict: *"the heuristic RecursiveCharacterTextSplitter … is consistently
  high performing across all evaluation metrics"*.
- **Overlap hurts precision more than it helps recall.** The same study shows
  IoU and Precision falling monotonically as overlap rises, and the OpenAI
  default (800/400 tokens) landing among the *worst* recall-efficiency
  trade-offs. Overlap is not free: it duplicates payload and inflates the index.
- **Semantic chunking's edge is not reliable.** *Is Semantic Chunking Worth the
  Computational Cost?* (NAACL 2025) finds the gain over fixed-size chunking
  inconsistent across datasets while costing an embedding call per sentence.
  We therefore benchmark it as one arm, not as the presumptive winner.
- **Optimal size is a property of the corpus, not a constant.** 64–128 tokens
  wins on short fact-based QA; 512–1024 wins where the answer is dispersed
  (*Rethinking Chunk Size for Long-Document Retrieval*, 2025). BRH documents are
  the second kind — a rate, its period and its qualifier usually share a
  paragraph — but that is a hypothesis this experiment tests rather than
  assumes.
- **French is not English.** The default separators split after `Art.`, `M.`,
  `n°`, `cf.`, `etc.` and after the decimal point in `28,3`. The reference
  implementation in `reference/full-implementation` uses
  `[". ", "; ", ", ", " "]` with `keep_separator=False`, which both breaks after
  abbreviations and **drops the punctuation from the chunk text**. Measured
  below; the shipped splitter must use `keep_separator="end"`.

## Constraints the chunker must satisfy (not up for vote)

1. **A chunk never spans a page** (ADR-0005). Citations deep-link `#page=N`.
2. **Chunk ids are deterministic** — `{document_id}:p{page}:c{ordinal}` — so
   re-ingestion is idempotent and vectors are addressable.
3. **Under the embedder ceiling.** `multilingual-e5-large` truncates silently
   at ~512 tokens. A French token is ~4.5 characters, so ~2 000 characters is
   the hard wall; the design target is a p95 below 1 500 characters of chunk
   text so a table or a long word does not push a passage over.
4. **Zero network, zero keys, deterministic.** The chosen config must be
   re-derivable in CI byte-for-byte.

## Corpus and sample

`data/ocr/<sha256>/document.md` — 757 documents, 11 323 non-blank pages, p50
2 271 characters, p90 4 873, 6 204 table-ish blocks, 12 949 headings. This is
the text the pipeline will actually see, page markers included, so the
experiment measures the corpus rather than a stand-in.

Deterministic stratified sample (`seed=20261023`): 600 pages drawn across
document length and content class, then split into buckets so short pages,
table pages and heading-heavy pages are all represented. Pages under 120
characters are excluded — a chunker cannot be judged on a page that is one
chunk.

## Candidate chunkers

Every arm is a LangChain splitter, because `chunk.py` must be LangChain and a
benchmark of hand-rolled splitters would not transfer.

| arm | LangChain class | config | hypothesis |
|---|---|---|---|
| `fixed-1000` | `CharacterTextSplitter(separator="")` | 1000 / 0 | control: no boundary respect |
| `recursive-600-100` | `RecursiveCharacterTextSplitter` | 600 / 100 | small chunks for fact lookup |
| `recursive-1000-0` | `RecursiveCharacterTextSplitter` | 1000 / 0 | the no-overlap reading of Chroma |
| `recursive-1000-150` | `RecursiveCharacterTextSplitter` | 1000 / 150 | current `Settings` default |
| `recursive-1500-0` | `RecursiveCharacterTextSplitter` | 1500 / 0 | context-heavy passages |
| `recursive-fr-1000-150` | `RecursiveCharacterTextSplitter` | 1000 / 150, abbreviation-safe sentence regex, `keep_separator="end"` | French-aware boundaries |
| `markdown-1000-150` | `MarkdownHeaderTextSplitter` → `RecursiveCharacterTextSplitter` | `##`/`###` then 1000 / 150 | structure-aware; keeps a heading with its body |
| `semantic-shift-1000` | lexical-shift (TextTiling-style) + size cap | 1000 | semantic arm without a model call |

The last arm is labelled *lexical-shift*, not *neural semantic*, on purpose: it
scores adjacent sentence blocks with hashed-token cosine and cuts where the
score drops below one standard deviation of the page's own distribution. It
costs nothing, runs offline, and is the fair proxy for "would a semantic
chunker help here?" without pretending to be Chroma's `SemanticChunker`.

## Metrics

Ground truth is a **needle**: a deterministic 150–400 character span of 1–3
sentences taken from a sampled page. The correct chunk is the one that contains
that span whole. Two query regimes, because one alone flatters the splitter:

- `verbatim` — the query is the needle. Upper bound; isolates boundary loss
  and chunk tightness.
- `keywords` — the query is 5 content tokens drawn from the needle, which is a
  crude stand-in for a user who does not quote the document.

Retrieval is BM25 (k1=1.5, b=0.75) over the arms' own chunk index, so the
comparison is lexical and embedding-independent — no model, no key, and
re-runnable in CI. Ranking power is therefore a proxy for the real embedder;
what it measures faithfully is *whether the passage is separable at all*, which
is the chunker's job.

| metric | what it catches |
|---|---|
| `recall@1`, `recall@5` | is the answer retrievable |
| `mrr@5` | how high it ranks |
| `needle_tightness` | needle chars / hit chunk chars — how much noise the reader gets |
| `boundary_loss` | needle not whole in **any** chunk — split across a cut |
| `chars_per_chunk` p50/p95 | embedder ceiling compliance |
| `chunk_count` | index cost |
| `abbrev_cut` | chunk ends on `Art.` / `M.` / `n°` / `etc.` — a French false cut |
| `midword_cut` | next chunk starts mid-word |
| `table_split` | a GFM table block broken across chunks |
| `heading_orphan` | a chunk that is a heading with almost no body |

`needle_tightness` and `boundary_loss` are computed from exact substring
containment, not from offsets, so they cannot drift when a splitter strips
whitespace.

## Decision rule

> **Amended 2026-10-23, after the first single-seed run and before the 3-seed
> run.** The original rule gated `boundary_loss ≤ 0.02`. That bound is
> unattainable by construction — a 150–400 character needle inside a
> 1 000-character chunker crosses a cut roughly 30 % of the time — so it would
> have disqualified every arm, including the eventual leader. It was replaced
> by a gate on an actual defect (`midword_cut`) plus a *reported*
> `page_recall@5`. The change is recorded rather than applied silently; it does
> not change the ranking, and `boundary_loss` is still reported for every arm.

Choose the arm that **maximises the worst `recall@5`** across the verbatim and
keyword regimes, subject to:

- `chars_per_chunk` p95 ≤ 1 500 (the embedder ceiling),
- `midword_cut` ≤ 0.05 (a boundary that cuts through a word),
- `table_split` ≤ 0.10.

Ties are broken by `needle_tightness`, then by fewer chunks. `boundary_loss` and
`page_recall@5` are reported, not gated: a citation is page-level, and a passage
split across two adjacent chunks still lands on the right page.

The rule produces a **recommendation**, not a decision. A decision needs
sign-off, and only then an ADR.

## Outputs

Everything below is an **experimentation artefact**. Nothing ships from
`experiments/`: no module under `brh_core`, no config default, no ADR.

- `experiments/notebooks/0004-chunking-strategies.ipynb` — the run, offline and
  seeded. The notebook *is* the experiment; `experiments/` is not a package.
- `experiments/chunking/results.json` — every arm × regime × metric.
- `experiments/chunking/REPORT.md` — the tables and the leading candidate.

Implementation is a separate, later step and starts only after the results are
signed off: an ADR, then a prototype behind a test, then
`brh_core.ingestion.chunk` and the `Settings` defaults. Until then the scaffold
stays a scaffold, and this notebook owes it nothing.

## Out of scope

- Retrieval with the production embedder (`multilingual-e5-large`) and
  Pinecone: it needs keys and a live index, and it measures retrieval, not
  chunking. It becomes the evaluation harness in the backlog.
- Reranking, parent-document retrieval, late chunking.
- Table reconstruction (ADR-0005 already defers it).
