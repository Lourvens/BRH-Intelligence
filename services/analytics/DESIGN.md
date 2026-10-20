# BRH Intelligence — chart & asset style guide

How our stats look. The goal is to be unmistakably BRH without looking like
2018: keep the bank's navy and its Montserrat, drop the gradients, the framed
charts and the centred titles.

The palette here is not invented. It was sampled from brh.ht and then tuned
where accessibility demanded it — see *Where this comes from*.

---

## Where this comes from

Measured, not guessed:

| Signal | Finding |
|---|---|
| Logo | `themes/brh/img/logo.png` (251×123) is **monochrome** — every opaque pixel is `#031A71`. That is the brand anchor. |
| Theme CSS | Leans on `#012A67` / `#05155B` navy, `#1E4B9E` blue, `#005B8A` deep blue. Accents: `#009CDC` azure, `#E8D833` gold, `#593196` purple. |
| Fonts | `<link>` loads **Montserrat** (all weights); headings use it. Buttons use Poppins, the slider plugin injects Roboto. |
| Surfaces | Near-white `#F8FAFC` family behind white cards. |
| Text | `#3D3D3D`, muted `#6C6C89`. |

Two changes were forced by contrast maths, not taste:

- `#E8D833` gold is **1.5:1 on white** — unusable for text or thin lines. It
  survives as a fill/highlight, and `gold-ink` (`#A67C00`) is the same hue at
  3.8:1 for anything that must be read.
- The site's flat greys were replaced with a cool navy-tinted neutral ramp, so
  text sits in the brand family instead of fighting it.

## Palette

Contrast is measured against white. Thresholds are WCAG 2.1 AA: **4.5:1** for
text, **3:1** for graphics.

### Brand

| Token | Hex | Use | On white |
|---|---|---|---|
| `navy` | `#031A71` | Primary. Logo, default series, headline numbers | 15.1:1 |
| `navy-deep` | `#05155B` | Dark surfaces, footers, gradient base | 16.6:1 |
| `navy-700` | `#012A67` | Headings and links on light | 13.7:1 |
| `blue` | `#1E4B9E` | Secondary | 8.2:1 |
| `teal` | `#005B8A` | Tertiary | 7.3:1 |
| `azure` | `#009CDC` | Accent, highlight | 3.1:1 |
| `gold` | `#E8D833` | Accent — **fills only**, never text | 1.5:1 ⚠ |
| `gold-ink` | `#A67C00` | Gold as a line or label | 3.8:1 |
| `purple` | `#593196` | Accent | 9.1:1 |
| `steel` | `#5279B3` | Muted series colour | 4.3:1 |
| `slate` | `#6C6C89` | The site's own grey — "unclassified", neutrals | 5.1:1 |

### Neutrals

| Token | Hex | Use | On white |
|---|---|---|---|
| `bg` | `#F7F9FC` | Page background | — |
| `surface` | `#FFFFFF` | Panels and chart areas | — |
| `surface-alt` | `#EEF3FA` | Zebra rows, inset blocks | — |
| `border` | `#E3E9F2` | Hairlines, gridlines | 1.2:1 |
| `ink` | `#0B1729` | Body text | 18.0:1 |
| `ink-muted` | `#5A6B87` | Captions, axis labels | 5.4:1 |

### Chart scales

**Categorical**, in this order — the first two or three are what most charts
use, so the order matters:

`S1 navy` → `S2 azure` → `S3 gold-ink` → `S4 purple` → `S5 teal` → `S6 steel`

Past six series, facet or aggregate. Do not add a seventh colour to a *series*
rotation.

**Category** charts (every bar visible at once) are the exception: no two bars
may share a hue, so they use an eight-colour ramp — the six series colours plus
`slate` and `scarlet`. A "green means good" reading is not available there, so
never use `scarlet` for a category in the same chart as a positive/negative
pair.

**Semantic:** `positive` `#0E7C66` (5.1:1), `negative` `#C8102E` (5.9:1).

**Sequential** (heatmaps, intensity): `#EEF3FA` → `#C7D8F5` → `#8FB0E8` →
`#5279B3` → `#1E4B9E` → `#031A71`.

> **The one layout rule that follows from the numbers:** plot on `surface`
> (white), never on `bg`. Azure clears 3:1 on white and misses it on the
> tinted page.

## Type

| Role | Face | Weight | Notes |
|---|---|---|---|
| Display, titles, headline figures | **Montserrat** | 700 / 600 | The brand voice. Uppercase only for short eyebrows/kickers, at `+0.08em` tracking. |
| Body, chart labels, UI | **Inter** | 400 / 500 / 600 | Screens and dense labels. Use **tabular figures** everywhere numbers align. |

Scale: `12 · 14 · 16 · 20 · 24 · 32 · 44 · 64`. Base `16`, line-height `1.5`.
Title and subtitle are **left-aligned**, never centred.

| Chart element | Spec |
|---|---|
| Chart title | Montserrat 600, 20 |
| Subtitle | Inter 400, 14, `ink-muted` |
| Axis labels / ticks | Inter 500, 11–12, `ink-muted` |
| Legend | Inter 500, 12, `ink` |
| Value labels | Inter 600, 14, `ink` |
| Source line | Inter 400, 11, `ink-muted` |

**Numbers are French.** Thousands separator is a narrow no-break space, the
decimal is a comma, and a no-break space precedes `%`:

```
18 450 000 000 gourdes      →   18 450 000 000
inflation 24,3 %                 taux de 3,75 %
```

## Charts

**Always**

- White plot area; no frame, no border, no background tint.
- **A chart is naked.** It carries data and nothing else — the asset around it
  owns the headline, the legend and the source line. That is what lets the same
  chart drop into a slide or a report without fighting baked-in text.
- When every bar is labelled directly, drop the value axis: the labels are the
  axis, and gridlines behind them are just furniture.
- When an axis is needed, horizontal gridlines only, `border` at 1px. No
  vertical grid, no tick marks beyond the axis.
- Legend above the plot, horizontal, when there is more than one series.
- Source line bottom-left of the **asset**: `Source : Banque de la République
  d'Haïti (brh.ht) · <date>`.
- Zero baseline on bars. Truncated axes must be labelled.
- A bucket — "Autres", "Divers", "N/A" — is never charted. It outranks the
  named categories and contradicts whatever the headline claims. Its size goes
  in the caption.

**Never**

- 3D, drop shadows, or gradients on the data itself.
- More than six series in one chart.
- Colour as the only signal.
- Gold as a line, label, or text colour.
- Pie/donut past five slices — use a sorted bar chart.

| Data | Chart | Notes |
|---|---|---|
| Trend over time | Line | 2px, direct labels if ≤5 points; area fill at 12–18% opacity |
| Comparison across categories | Horizontal bar | Sorted by value; label values at the bar end |
| Composition | Stacked bar | Avoid donuts for >5 parts |
| Distribution | Histogram | — |
| One number | Stat card | Montserrat 700, `navy`; the number *is* the chart |
| Correlation | Scatter | 4px markers, 60% opacity, no regression line unless stated |

**Accessibility:** distinguish series by more than hue — vary line style
(solid/dashed/dotted) or marker. Red/green pairs always carry a sign or an
arrow. Data must sit ≥3:1 against the background and data labels ≥4.5:1.

## Canvases

| Format | Size | For |
|---|---|---|
| Square | 1080×1080 | Instagram, LinkedIn feed |
| Portrait | 1080×1350 | Instagram / LinkedIn portrait |
| Story | 1080×1920 | Stories, Reels, TikTok |
| Landscape | 1200×630 | Link previews (OG), X |
| Slide | 1920×1080 | Decks, presentations |

Margins: **72px** on 1080-wide, **64px** on 1200-wide, **96px** top/bottom.
On story canvases keep content between `y=250` and `y=1670` so platform chrome
never covers it.

**Anatomy of a post** — reuse this, don't redesign each time:

```
┌──────────────────────────────────────┐
│  EYEBROW            (Montserrat 600, │  ← gold-ink, uppercase, tracked
│                       uppercase, 14) │
│  Headline that says one thing        │  ← Montserrat 700, 32–44, ≤2 lines
│                                      │
│  ┌────────────────────────────────┐  │
│  │            the chart           │  │  ← ~55% of the canvas, white panel
│  └────────────────────────────────┘  │
│                                      │
│  24,3 %                              │  ← the one figure that matters,
│  Inflation, septembre 2026           │    Montserrat 700 in navy + Inter caption
│                                      │
│  ▬▬ BRH · brh.ht       15/10/2026    │  ← navy footer bar, white logo left
└──────────────────────────────────────┘
```

One idea per asset. If a post needs two charts, it is two posts.

**Logo:** use the original PNG, never recolour it, never stretch it (native
ratio 251×123 ≈ 2.04:1). Clear space on all sides = the height of the `B`.
On navy, use the white version.

## Icons and illustrations

Both are vocabulary, not decoration. They may name a category, a machine or a
warning; they may never stand in for a number, a label or a chart.

**Icons.** 24×24 grid, one colour from `palette`, 1.75 px stroke at 24 px and
scaled with the icon (never below 1 px). One icon per block, always beside the
text it labels, never as the only content of a block. Use them for provenance
badges, machine/GPU rows, document kinds and data-quality warnings. Borrow path
data from Lucide (ISC) and commit it: renders are offline, so nothing is fetched
at draw time.

**Illustrations.** Flat geometry built from palette tokens on `SURFACE` — no
gradients, no shadows, no stock art. They explain structure (a pipeline, a
document becoming pages, scanned versus born-digital) and are allowed only when
the finding has no series to chart. Label the parts; an unlabelled illustration
is decoration.

**Never** — emoji · fetched or stock assets · raster logos other than the brand
PNG · a colour outside `palette` · an icon or illustration where a chart would
answer "how many" or "where" · more than one illustration per asset.

## Rules

**Do** — one idea per asset · left-align · always show a source and a date ·
lead with `navy` · keep whitespace · use tabular figures · **state the scope of
the data**: a figure measured on a sample says so, in the eyebrow or the
caption, and is never charted as if it covered the corpus.

**Don't** — tint the background behind charts · use the raw gold `#E8D833` for
text (that is what `gold-ink` is for) · mix more than four type sizes on one
asset · add shadows or gradients to data · recolour or stretch the logo ·
invent colours outside this palette.

## Implementation

| Module | Job |
|---|---|
| `palette.py` | The tokens. **The only place a hex value is written.** |
| `formatting.py` | French numbers, dates and byte sizes. |
| `charts.py` | Chart primitives, from numbers and labels only. |
| `finding.py` | The `Finding` shape every family produces. |
| `posts.py` | Composes copy + chart + footer onto a canvas. |
| `families.py` | The registry the CLI and dashboard iterate. |
| `swatches.py` | Renders `assets/palette.png`. |
| `app.py` | The Streamlit dashboard. |
| `inventory/` | The inventory family: its source and its copy. |
| `corpus/` | The corpus family: extraction records, page profiles, coverage. |

A family is a package under `src/brh_analytics/` exposing `build()`. Charts and
posts stay family-agnostic so the next family inherits the whole design system
for free.

- The contrast figures in this guide are produced by `palette.check()` — run
  `uv run python -m brh_analytics` to regenerate
  [`assets/palette.png`](assets/palette.png) and every post into
  `out/<family>/`, so output is grouped the way the code is.
- Fonts: Montserrat and Inter are SIL OFL. Not bundled yet — drop the TTFs in
  `assets/fonts/` (Montserrat first, then Inter) and the renderers and charts
  pick them up; until then rendering falls back to DejaVu, which keeps the repo
  offline-clean.
- The BRH mark is not bundled either. Save it to `assets/logo.png` and the
  footer picks it up. It is BRH's mark: never recolour or stretch it.
- Localisation: French number and date formats (`15/10/2026`), narrow no-break
  spaces inside numbers, no-break space before `%`.
