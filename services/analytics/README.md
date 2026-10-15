# brh-analytics

Stats, charts and social-media assets built on the BRH corpus.

**Status:** scope created, palette fixed, no charts yet. Next step is picking
the plotting stack (see *Open question* below).

- [`DESIGN.md`](DESIGN.md) — the style guide: palette, type, chart rules,
  social canvases. Read this before drawing anything.
- `src/brh_analytics/palette.py` — the tokens the guide describes, and the only
  place a hex value is written.

```bash
uv run python -m brh_analytics      # regenerate assets/palette.png
uv run ruff check services/analytics
```

## Why it exists

BRH's documents are the product; a chart is how one of them travels. This scope
turns the corpus into a single, repeatable visual answer — a number, a graph, a
post — rather than something redrawn by hand each time.

## Planned shape

```
src/brh_analytics/
  palette.py     tokens (done)
  swatches.py    renders assets/palette.png (done)
  charts.py      one function per chart, styled from the palette
  canvases.py    social/slide templates + text & logo composition
  stats.py       the queries the charts read from brh-core
```

Everything renders to deterministic pixel sizes so a post is reproducible, and
the same figure can go out as PNG (social) or SVG (slides).

## Open question — plotting stack

The export path is **matplotlib**: it renders exact pixel canvases offline, in
PNG and SVG, with no browser. That choice does not depend on what follows.

What follows — the interactive layer for exploring and tweaking before export —
is still open: **Streamlit** (best fit for a data dashboard with downloads),
Gradio (simpler input→output demos), or no UI at all (a CLI that writes every
asset in one pass). Pillow is already a dependency because composing a social
canvas — text, logo, chart, footer — is image work regardless of the chart lib.
