# apps/web — BRH Intelligence web app

Next.js 16 (App Router) + React 19 + Tailwind v4. The chat consumes the
LangGraph agent with the official SDK `useStream` hook (ADR-0008).

## Run

```bash
cp .env.example .env.local     # point at the LangGraph server
bun dev                        # http://localhost:3000
```

The agent server must be running (`make agent-dev` from the repo root, default
`http://localhost:2024`).

## Structure

| Path | Responsibility |
|---|---|
| `app/page.tsx` | The chat screen |
| `components/chat.tsx` | Chat orchestration (stream → messages/citations) |
| `components/message-bubble.tsx` | Renders an answer with inline `[n]` chips |
| `components/citations.tsx` | Citation chips + the sources list |
| `components/composer.tsx` | Input + stop/send |
| `lib/agent.ts` | `useAgent()` — the `useStream` wiring and state type |
| `lib/citations.ts` | Splits `[n]` markers out of an answer |
| `lib/messages.ts` | Reads LangGraph messages without internal types |
| `app/api/pdfs/[slug]/route.ts` | Streams a source PDF from `data/` |
| `app/documents/[slug]/page.tsx` | PDF viewer (`#page=N` deep link target) |

## How citations open the right page

The agent returns citations with a `slug` and `page_number`. A chip links to
`/documents/{slug}?page=N`, which embeds `/api/pdfs/{slug}#page=N`. The API
route resolves `slug → source file` through `data/processed/catalog.json`,
written by `python -m brh_core.ingestion` (or `python -m brh_core.catalog`).

## Env

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_LANGGRAPH_URL` | LangGraph server URL (dev `:2024`) |
| `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID` | Graph id (default `agent`) |
| `BRH_DATA_DIR` | Repo `data/` dir for the PDF route (default `../../data`) |
