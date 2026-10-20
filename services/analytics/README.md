# brh-analytics

Stats, charts and social-media posts built on the BRH corpus.

**Status: working, two families.** `inventory` reads the crawl ledger — titles,
dates, sizes, status. `corpus` reads what OCR actually produced — pages,
characters, figures, seconds — plus the per-page profile of the sample.
Both render to postable images and browse in the dashboard. `tests/` covers the
corpus family offline; `make analytics` remains the visual check.

```bash
make analytics                              # palette sheet + every family → out/
make analytics ARGS="--family inventory"    # one family
make analytics ARGS="--family corpus"       # the OCR corpus
make analytics ARGS="--size portrait"       # a different canvas
make analytics ARGS="--palette-only"
make analytics-dev                          # Streamlit dashboard
uv run pytest services/analytics            # offline tests
```

- [`DESIGN.md`](DESIGN.md) — the style guide. **Read it before drawing anything.**
- `src/brh_analytics/palette.py` — the tokens, and the only place a hex lives.
- The `analytics` agent
  ([`.opencode/agents/analytics.md`](../../.opencode/agents/analytics.md)) owns
  this scope: it carries the rules below, so hand it the work rather than
  re-deriving them.

## Grouped by family

Analytics comes in families, and so do the code and the output. A family owns a
source, a body of copy and a `build()`; the shared layer below knows nothing
about any of them.

```
src/brh_analytics/
  palette.py formatting.py assets.py     the design layer — no domain types
  charts.py finding.py posts.py          shared: draw, describe, compose
  families.py                            the menu of families
  inventory/                             ← the inventory family
    ledger.py                            reads corpus.crawl_urls
    findings.py                          its copy
  corpus/                                ← the corpus family
    source.py                            reads data/ocr/ + the page profile
    findings.py                          its copy

out/
  inventory/archive-square.png           ← output mirrors the code
  corpus/couverture-square.png
```

Adding a family means adding a package and one line in `families.py`. Nothing
else changes.

| Module | Job |
|---|---|
| `palette.py` | Design tokens + WCAG contrast maths. |
| `formatting.py` | French numbers, dates, byte sizes, durations. |
| `assets.py` | Font and logo loading. |
| `charts.py` | Chart primitives from numbers and labels — **no domain types**. |
| `finding.py` | The `Finding` shape: copy + figure + a chart. |
| `posts.py` | Composes a finding onto a canvas. |
| `families.py` | The registry the CLI and dashboard iterate. |
| `swatches.py` | The palette sheet. |
| `app.py` | Streamlit dashboard. |
| `inventory/` | The inventory family: source + copy. |
| `corpus/` | The corpus family: source + copy. |
| `tests/` | Offline tests for the corpus family and the formatting contract. |

## The inventory family

Six angles, each one idea, each with its figure derived from the ledger so the
copy cannot drift from the data:

| Slug | Angle |
|---|---|
| `archive` | 1 169 documents, 2018 → today |
| `migration` | 347 documents "published" in two days — it was a site migration |
| `familles` | what the BRH actually publishes |
| `inflation` | the monthly note, and the years it was not monthly |
| `recrutement` | job postings living in the media library |
| `qualite` | 198 titles that arrived damaged |

## The corpus family

Eight angles on what the OCR pipeline has read, each figure derived from
`meta.json` or `page-profiles.json`:

| Slug | Angle |
|---|---|
| `couverture` | 182 documents extracted of 1 169 — 15,6 % |
| `reste` | 1 053 documents still undownloaded; 480 of them from 2018 |
| `volume` | seven 67-page documents hold a fifth of all pages |
| `rythme` | 22,6 s per page on average, 136,8 s at worst |
| `queue` | 11 documents cost more than 20 minutes; the slowest 32 min 20 s |
| `pages` | 336 pages have no text layer, concentrated in 2022 and 2020 |
| `hybride` | 20 documents mix scanned and digital pages — route per page |
| `tableaux` | 217 pages carry a table, none of them scanned |

Two registers, never mixed. `couverture`, `volume`, `rythme` and `queue`
describe the **182 extracted documents**; `reste` describes the catalogue's
remaining queue. `pages`, `hybride` and `tableaux` come from the **per-page
profile of the 116-document sample** (`experiments/gold/page-profiles.json`) and
say so in their eyebrow and caption.

## Notes

- **`inventory` reads the crawl ledger, not the corpus.** `corpus.crawl_urls` is
  ops data, so ADR-0006 (surfaces retrieve through `RetrievalService`) does not
  apply.
- **`corpus` reads extraction artefacts, not the retrieval store.** Volume,
  cost and page composition come from `data/ocr/<sha256>/meta.json` and
  `experiments/gold/page-profiles.json` — files, not Postgres or Pinecone.
  Coverage is the one exception, and it reads the same ops table as `inventory`.
  When retrieval lands, corpus stats that need *chunks or vectors* must go
  through `RetrievalService`; nothing here does.
- **Postgres is optional for `corpus`.** If the catalogue is unreachable,
  `load_catalogue()` warns and returns `None`; the disk findings still render
  and only `couverture`/`reste` are skipped. A missing source is never turned
  into a zero.
- **The 182 is the local corpus, not the volume's total.** Analytics counts only
  documents it can read and verify (`document.md` non-empty, `meta.json`
  present) — a document sitting on a remote volume has not been measured.
- **The catalogue's own count disagrees by 66 documents.** The crawl ledger
  records 116 downloads; the OCR batches fetch PDFs outside the inventory, so
  182 are extracted. `couverture` says so in its caption rather than hiding the
  gap.
- **Titles are cleaned on read, never in the source.** The ledger keeps what
  brh.ht returned; `inventory/ledger.py` decodes HTML entities and flags the
  titles whose accents were lost upstream. The `qualite` post is about that.
- **Family classification is a plain function over the title**
  (`ledger.family_of`), not SQL regex — easy to test and easy to argue with.
  About a third of titles still land in `Autres / séries`, and the posts say so
  rather than pretending the taxonomy is complete.
- A bucket is never charted. See the `familles` caption.
