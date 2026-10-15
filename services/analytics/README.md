# brh-analytics

Stats, charts and social-media posts built on the BRH corpus.

**Status: working, one family.** `inventory` is live — six findings drawn from
the crawl ledger, rendered to postable images and browsable in a dashboard. No
corpus ingestion yet, so every number here comes from what the *catalogue*
knows: titles, dates, sizes, status.

```bash
make analytics                              # palette sheet + every family → out/
make analytics ARGS="--family inventory"    # one family
make analytics ARGS="--size portrait"       # a different canvas
make analytics ARGS="--palette-only"
make analytics-dev                          # Streamlit dashboard
```

- [`DESIGN.md`](DESIGN.md) — the style guide. **Read it before drawing anything.**
- `src/brh_analytics/palette.py` — the tokens, and the only place a hex lives.

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

out/
  inventory/archive-square.png           ← output mirrors the code
```

Adding a family means adding a package and one line in `families.py`. Nothing
else changes.

| Module | Job |
|---|---|
| `palette.py` | Design tokens + WCAG contrast maths. |
| `formatting.py` | French numbers, dates, byte sizes. |
| `assets.py` | Font and logo loading. |
| `charts.py` | Chart primitives from numbers and labels — **no domain types**. |
| `finding.py` | The `Finding` shape: copy + figure + a chart. |
| `posts.py` | Composes a finding onto a canvas. |
| `families.py` | The registry the CLI and dashboard iterate. |
| `swatches.py` | The palette sheet. |
| `app.py` | Streamlit dashboard. |
| `inventory/` | The inventory family: source + copy. |

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

## Notes

- **This reads the crawl ledger, not the corpus.** `corpus.crawl_urls` is ops
  data, so ADR-0006 (surfaces retrieve through `RetrievalService`) does not
  apply here. Corpus charts, when they arrive, must go through
  `RetrievalService`.
- **Titles are cleaned on read, never in the source.** The ledger keeps what
  brh.ht returned; `inventory/ledger.py` decodes HTML entities and flags the
  titles whose accents were lost upstream. The `qualite` post is about that.
- **Family classification is a plain function over the title**
  (`ledger.family_of`), not SQL regex — easy to test and easy to argue with.
  About a third of titles still land in `Autres / séries`, and the posts say so
  rather than pretending the taxonomy is complete.
- A bucket is never charted. See the `familles` caption.
