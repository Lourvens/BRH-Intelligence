# apps/web — BRH Intelligence web app

Next.js 16 (App Router) + React 19 + Tailwind v4.

**Status: UI foundation + welcome page.** The design system is implemented and
the landing page renders. The chat, live citations and the PDF viewer are next
(see the build order in the root `README.md`).

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
figures.

The type scale is named (`text-micro` → `text-hero`) and `lib/utils.ts` teaches
`tailwind-merge` about it, so a size class never swallows a text colour.

## What exists

| Path | State | Responsibility |
|---|---|---|
| `app/layout.tsx`, `app/globals.css` | ✅ | Fonts, metadata, design tokens, base styles |
| `app/page.tsx` | ✅ welcome page | Hero, corpus band, method, CTA |
| `components/brand.tsx` | ✅ | BRH lockup on light surfaces |
| `components/site-header.tsx`, `site-footer.tsx` | ✅ | Shared shell |
| `components/answer-preview.tsx` | ✅ illustrative | Shows the answer + citation shape |
| `components/ui/*` | ✅ | Button and citation-chip primitives |
| `lib/agent.ts` | ⬜ contract + stub | `AgentState`/`Citation` types and `useAgent()` |
| `lib/utils.ts` | ✅ | `cn()` + tailwind-merge config |

## What to build

1. **`lib/agent.ts`** — wrap `useStream` from
   `@langchain/langgraph-sdk/react`, pointed at `NEXT_PUBLIC_LANGGRAPH_URL`.
   It returns `messages` (conversation), `values` (graph state, incl.
   `citations`), plus `submit`, `stop`, `isLoading`, `error`, `threadId`.
2. **Chat UI** — a message list + composer. Render `values.citations` under the
   latest answer using `components/ui/citation-chip.tsx`.
3. **Citation chips** — the agent cites with `[n]`; parse those markers and link
   each to `/documents/{slug}?page={n}`.
4. **PDF route + viewer** — `app/api/pdfs/[slug]/route.ts` streams a source PDF
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
