# apps/web — BRH Intelligence web app

Next.js 16 (App Router) + React 19 + Tailwind v4.

**Status: Stitch navbar + hero implemented.** The previous landing-page
implementation was removed and the page is being rebuilt from Stitch, one
section at a time. The sticky navbar and the hero are now in place; the corpus,
method and limits sections are intentionally still absent. The design system
(tokens, fonts, BRH logo, button and citation-chip primitives) remains.

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
| `app/fonts/` | Self-hosted Montserrat + Inter (SIL OFL, latin subset) — no build-time network. |
| `public/brh-logo.png` | The original BRH mark (251×123). Never recolour or stretch it. |
| `components/ui/button.tsx` | Primary / secondary / ghost / gold buttons. |
| `components/ui/citation-chip.tsx` | The source chip the chat will reuse. |

Rules worth repeating: `navy` leads, `gold` is a **fill only** (use `gold-ink`
for lines/labels), charts plot on `surface` not `bg`, and numbers use tabular
figures. All UI files stay **under 250 lines**.

The type scale is named (`text-micro` → `text-hero`) and `lib/utils.ts` teaches
`tailwind-merge` about it, so a size class never swallows a text colour.

## Stitch workflow

The landing page is rebuilt from Stitch references, one section at a time. When
a new reference is supplied, record its project and screen IDs here before
implementing it.

- Current reference: screen `296a96a976eb48cdb85d9cc1277275c0` —
  *BRH Intelligence — Hero Section Réinventée* (desktop, 2560px).
  Implemented: navbar + hero only. The HTML source was used as the layout
  reference; copy that claimed live indexing, zero hallucination, confidence
  scores or latency was replaced with corpus facts.
- Previous redesign (removed): project `14932998564978548471`, desktop screen
  `401097e628ce48af966647703191c905`, mobile screen
  `8b717e14e701499da428e788e1ccc756`.

## What exists

| Path | State | Responsibility |
|---|---|---|
| `app/layout.tsx`, `app/globals.css` | ✅ | Fonts, metadata, design tokens, base styles, dot-grid utilities |
| `app/page.tsx` | ✅ navbar + hero | Stitch screen `296a…`; no lower sections yet |
| `components/site-header.tsx` | ✅ | Sticky institutional navbar |
| `components/home/hero.tsx` | ✅ | Hero shell, filter/search state and layout |
| `components/home/hero/*` | ✅ | Search bar, image card, agent console, trust strip, content |
| `public/brh-archive-vault.jpg` | ✅ | Stitch hero image, locally hosted |
| `components/ui/button.tsx` | ✅ | Button primitive |
| `components/ui/citation-chip.tsx` | ✅ | Citation primitive |
| `lib/agent.ts` | ⬜ contract + stub | `AgentState`/`Citation` types and `useAgent()` |
| `lib/utils.ts` | ✅ | `cn()` + tailwind-merge config |

## What to build

1. **Landing sections** — the navbar and hero are done; implement the next
   Stitch reference sections one at a time. Add a component only when that
   section has a reference, and keep each file under 250 lines.
2. **`lib/agent.ts`** — wrap `useStream` from
   `@langchain/langgraph-sdk/react`, pointed at `NEXT_PUBLIC_LANGGRAPH_URL`.
   It returns `messages` (conversation), `values` (graph state, incl.
   `citations`), plus `submit`, `stop`, `isLoading`, `error`, `threadId`.
3. **Chat UI** — a message list + composer. Render `values.citations` under the
   latest answer using `components/ui/citation-chip.tsx`.
4. **Citation chips** — the agent cites with `[n]`; parse those markers and link
   each to `/documents/{slug}?page={n}`.
5. **PDF route + viewer** — `app/api/pdfs/[slug]/route.ts` streams a source PDF
   (resolve `slug → file` via `data/processed/catalog.json`), and
   `app/documents/[slug]/page.tsx` embeds it with `#page=N`.

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
