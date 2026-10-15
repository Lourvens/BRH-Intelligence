# apps/web — BRH Intelligence web app

Next.js 16 (App Router) + React 19 + Tailwind v4.

**Status: scaffold.** The app builds and renders a placeholder. The chat,
citations, and PDF viewer are yours to build (see the build order in the root
`README.md`).

## Run

```bash
cp .env.example .env.local     # point at the LangGraph server
bun dev                        # http://localhost:3000
```

The agent server must be running (`make agent-dev` from the repo root, default
`http://localhost:2024`).

## What exists

| Path | State | Responsibility |
|---|---|---|
| `app/layout.tsx`, `app/globals.css` | ✅ | Root layout + design tokens |
| `app/page.tsx` | ✅ placeholder | Landing / chat screen — replace |
| `lib/agent.ts` | ⬜ contract + stub | `AgentState`/`Citation` types and `useAgent()` |
| `lib/utils.ts` | ✅ | `cn()` class helper |

## What to build

1. **`lib/agent.ts`** — wrap `useStream` from
   `@langchain/langgraph-sdk/react`, pointed at `NEXT_PUBLIC_LANGGRAPH_URL`.
   It returns `messages` (conversation), `values` (graph state, incl.
   `citations`), plus `submit`, `stop`, `isLoading`, `error`, `threadId`.
2. **Chat UI** — a message list + composer. Render `values.citations` under the
   latest answer.
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
