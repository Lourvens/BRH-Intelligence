# apps/web — BRH Intelligence web app

Next.js 16 (App Router) + React 19 + Tailwind v4.

**Status: Stitch landing page + assistant shell.** The landing page follows the
`b961…` hero plus the `027b…` sections. `/assistant` is a full three-panel chat
workspace running on local demo transcripts, with sources, inline citations and
chart/graph artifacts. `lib/agent.ts` now wraps the LangGraph `useStream` hook;
the live graph connection and PDF viewer are next. The design system (tokens,
fonts, BRH logo, button and citation-chip primitives) remains the source of
truth.

## Run

```bash
cp .env.example .env.local     # point at the LangGraph server
bun dev                        # http://localhost:3000
```

The agent server must be running (`make agent-dev` from the repo root, default
`http://localhost:2024`) once the chat is wired.

## Design system

The source of truth is [`services/analytics/DESIGN.md`](../../services/analytics/DESIGN.md)
and its palette. The web app ports it rather than inventing a second style:

| Where | What |
|---|---|
| `app/globals.css` | Colour, type, radius and shadow tokens. The only place a hex is written. |
| `app/fonts/` | Self-hosted Montserrat, Inter and Source Serif 4 (SIL OFL, latin subset) — no build-time network. |
| `public/brh-logo.png` | The original BRH mark (251×123). Never recolour or stretch it. |
| `components/ui/*` | shadcn/ui primitives (`sidebar`, `tabs`, `card`, `button`, `sheet`, `tooltip`, …). |
| `components/ui/citation-chip.tsx` | The source chip the chat will reuse. |

Rules worth repeating: `navy` leads, `gold` is a **fill only** (use `gold-ink`
for lines/labels), charts plot on `surface` not `bg`, and numbers use tabular
figures. All UI files stay **under 250 lines**.

The type scale is named (`text-micro` → `text-hero`) and `lib/utils.ts` teaches
`tailwind-merge` about it, so a size class never swallows a text colour.

Type roles: **Montserrat** for display, **Inter** for UI and chart labels,
**Source Serif 4** (`font-reading`) for long-form reading — assistant answers,
document artifacts, blockquotes and source excerpts. Keep reading text at
15–16px with a ~1.7 line-height.

## UI libraries

Charts use **visx** for brand-critical, low-density bespoke work, or
**Apache ECharts** when the task needs many chart types, dense data, or advanced
interaction. The assistant chart renderer is ECharts; graphs detect trees
(`lib/chat/graph.ts`), use a lazy-loaded **Mermaid** diagram as the hierarchical
view, and offer an ECharts force `graph` for networks. Long trees default to a
vertical Mermaid layout with a vertical/horizontal toggle. Charts and graphs
open a shadcn `Dialog` focus mode from the **Agrandir** button. Components use
**shadcn/ui** (`components.json`, new-york, Tailwind v4); install with
`bunx shadcn@latest add <component>`. Do not add custom SVG chart paths. See the
binding rules in `AGENTS.md` and query Context7 for unfamiliar
visx/ECharts/Mermaid/shadcn APIs.

## Assistant artifacts

Agent visual output is data-first:

- `TableArtifact` carries columns, rows, provenance and a JSON `UIDecision`.
- The decision model picks `blockType` (`table`, `chart`, `graph`) and, for
  charts, `chartType` (`line`, `bar`, `area`) plus `x`/`y` column keys.
- `resolveArtifactBlock` validates the decision against the schema; invalid
  decisions fall back to a semantic table.
- Chart types: line (including multiple series), bar, area, pie, donut and
  scatter. The renderer accepts one or more `y` columns.
- `graphData` builds nodes and edges from edge-source/edge-target columns, so
  graphs are generated from the table, not hand-authored nodes. Graph artifacts
  detect trees (`lib/chat/graph.ts`) and expose **Réseau** (ECharts force graph
  with circular nodes) and **Diagramme** (lazy Mermaid flowchart) views behind
  shadcn `Tabs`. Trees default to the diagram, non-trees to the network, and long
  diagrams default to vertical orientation with a manual vertical/horizontal
  toggle. The demo `showcase-multimessage` thread walks through area, multi-line,
  donut, bar, tree and network artifacts in one conversation.
- Citations carry a `pdfUrl`; the source inspector and message source list open
  the PDF in a new tab, with the page deep link (`#page=N`) built by
  `brh_core.citations`.
- The message renders a collapsed **Décision de présentation** card with the
  JSON decision, so the renderer choice is inspectable.

The hybrid Open Intelligent UI contract lives in
`lib/chat/open-intelligent-ui.ts`: tables map to A2UI, charts/graphs map to
Open Generative UI. The native BRH renderer stays the default until the
CopilotKit runtime and an agent with `generateSandboxedUi` are enabled
(`NEXT_PUBLIC_OPEN_INTELLIGENT_UI`).

## Stitch workflow

The landing page is rebuilt from Stitch references, one section at a time. When
a new reference is supplied, record its project and screen IDs here before
implementing it.

- Current hero reference: screen `b961ed14011a4dddb1cb2a19b9894f1d` —
  *BRH Intelligence — Landing Page Hero Officiel* (desktop, 2560px).
  Implemented: the hero only — centred copy, product showcase and corpus trust
  band.
- Current sections reference: screen `027bffa8af21414d94f24317e0b8e889` —
  *BRH Intelligence — Landing Page Complète Officielle* (desktop, 2560px).
  Implemented: pipeline, corpus, use cases, comparison, FAQ, access CTA and
  footer. The navbar keeps the BRH product nav but points at the new anchors.
- Assistant reference: screen `81afab0033054e6d9c1f58636ea87fb8` —
  *BRH Intelligence — Assistant Documentaire Chat Workspace* (desktop, 2560px).
  Implemented as the `/assistant` three-pane workspace, with ECharts artifacts,
  source inspector, decision card and mobile drawers.
- Collapsible rails exploration: screen
  `1dcc653cdff9474297b37ef2d5d12c99` — *BRH Intelligence — Exploration Rails
  Rétractables (Déplié vs Replié)*. Implemented as the icon sidebar and the
  48px source rail.
- Focus-mode exploration: generated in the same Stitch project from the
  "Agrandir" prompt. Implemented as the shadcn `Dialog` in
  `components/assistant/artifacts/expandable-visualization.tsx`.
- Previous full-page reference: screen `296a96a976eb48cdb85d9cc1277275c0` —
  replaced by the screens above.
- The Stitch HTML was used as the layout reference. Claims about live indexing,
  guaranteed accuracy, 40 years, confidence scores, latency, OCR certification,
  legal value and vault-style integrity were replaced with the real corpus
  facts.

## What exists

| Path | State | Responsibility |
|---|---|---|
| `app/layout.tsx`, `app/globals.css` | ✅ | Fonts, metadata, design tokens, base styles, dot-grid utilities |
| `app/page.tsx` | ✅ landing page | `b961…` hero + `027b…` sections |
| `app/assistant/page.tsx` | ✅ assistant | Three-panel Stitch workspace, demo transcripts |
| `components/assistant/*` | ✅ | Sidebar, chat, message content, sources, decision card, chart/graph artifacts |
| `lib/chat/*` | ✅ demo | Table schema, decision validation, threads, citations, artifacts |
| `lib/chat/decision.ts` | ✅ | Validates `UIDecision` and derives chart/graph data from table rows |
| `lib/chat/open-intelligent-ui.ts` | ✅ contract | Table→A2UI / chart-graph→Open Generative UI routing |
| `components/site-header.tsx` | ✅ | Sticky institutional navbar |
| `components/home/hero.tsx` | ✅ | Hero copy, CTAs and section shell |
| `components/home/hero/*` | ✅ | Showcase, answer/document panes, archive strip, trust band, data |
| `components/home/pipeline-section.tsx` | ✅ | Four-step document pipeline |
| `components/home/corpus-section.tsx` | ✅ | Corpus narrative, metrics, families and archive image |
| `components/home/usages-section.tsx` | ✅ | Four professional use cases |
| `components/home/comparison-section.tsx` | ✅ | Sourced search vs general assistant |
| `components/home/faq-section.tsx` | ✅ | Data, perimeter and freshness FAQ |
| `components/home/access-cta.tsx` | ✅ | Closing demo/corpus CTA |
| `components/site-footer.tsx` | ✅ | Institutional footer |
| `public/brh-corpus-archive.jpg` | ✅ | Stitch archive image, locally hosted |
| `components/ui/button.tsx` | ✅ | Button primitive |
| `components/ui/citation-chip.tsx` | ✅ | Citation primitive |
| `lib/content/navigation.ts` | ✅ | Shared navbar/footer links |
| `lib/agent.ts` | ✅ SDK boundary | `AgentState`/`Citation` types + `useAgent()` wrapping `useStream` |
| `lib/utils.ts` | ✅ | `cn()` + tailwind-merge config |

## What to build

1. **Live agent wiring** — connect the `/assistant` shell to `useAgent` from
   `lib/agent.ts`, replacing the local demo controller. Use SDK thread history
   for the sidebar and render `stream.messages` / `values.citations`.
2. **Streaming states** — map `isLoading`, tool progress, errors and refusal
   updates into the existing chat/status components; keep the stop control.
3. **PDF route + viewer** — `app/api/pdfs/[slug]/route.ts` streams a source PDF
   (resolve `slug → file` via `data/processed/catalog.json`), and
   `app/documents/[slug]/page.tsx` embeds it with `#page=N`.
4. **Persistence** — replace demo threads with the real thread store.

## How citations will open the right page

The agent emits citations with a `slug` and `page_number`. A chip links to
`/documents/{slug}?page=N`, which embeds `/api/pdfs/{slug}#page=N`. The API
route resolves `slug → source file` through `data/processed/catalog.json`,
written by `python -m brh_core.catalog`.

## Env

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_LANGGRAPH_URL` | LangGraph server URL (dev `:2024`) |
| `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID` | Graph id (default `agent`) |
| `BRH_DATA_DIR` | Repo `data/` dir for the PDF route |
