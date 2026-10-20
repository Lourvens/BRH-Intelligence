# Agent chat UI — design

**Date:** 2026-10-19  
**Route:** `/assistant`  
**Status:** design approved for implementation

## Goal

A full-page institutional chat workspace for BRH Intelligence: conversation
history on the left, the active conversation in the centre, and the cited
sources on the right. The visual language stays the same as the landing page
(navy, azure, gold, Montserrat/Inter, light surfaces).

## Layout

Three panels on a `h-dvh` shell:

1. **Conversation rail** (280px, light surface): BRH lockup, “Nouvelle
   conversation”, search, local example threads, back-to-site link. It becomes a
   left drawer below `lg`.
2. **Chat** (flexible): slim header with the active title, archive status and a
   sources toggle; scrollable message area; sticky composer.
3. **Sources rail** (320px, light surface): selected citation, page, snippet and
   the full citation list for the active answer. It becomes a right drawer below
   `xl`.

## Initial state

The empty state is the product statement: “Que cherchez-vous dans les archives ?”
with four sourced example questions from the real corpus (inflation, BRH
creation, BIC, cooperatives). Clicking one opens a prepared demonstration thread.
A “Démo” marker makes clear that the page is currently running on local
transcripts, not a live index.

## Conversation

- User messages: right-aligned navy bubble.
- Assistant messages: left-aligned surface card with a small institutional mark.
- Answers carry numbered source chips. Selecting a chip updates the right rail.
- Generated artifacts sit between the answer and the source list:
  - **Chart** — title, subtitle, series, unit, source line, accessible SVG.
  - **Graph** — ordered source/evidence chain with node kind and page.
  - Artifacts are plain React data (`ChartArtifact` / `GraphArtifact`), so the
    graph can later emit them through a custom stream event without changing
    the message shell.
- A refusal is a distinct state: gold/scarlet accent, explicit “Le corpus ne
  soutient pas cette question”, no invented answer.
- While a question is being handled, the message area shows a compact search
  status; the composer exposes stop.
- The composer sends on Enter, inserts a newline on Shift+Enter, and is disabled
  while empty or thinking. Auto-scroll follows new output until the reader
  scrolls up.

## SDK boundary

`lib/agent.ts` is the only LangGraph SDK boundary. It wraps `useStream` from
`@langchain/langgraph-sdk/react`, using `NEXT_PUBLIC_LANGGRAPH_URL` and
`NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID`. The page can later swap its local demo
controller for this hook without changing the presentation components.

The local demo data lives in `lib/chat/demo.ts`; it uses real corpus facts and
page references. No claims of live indexing, confidence or perfect accuracy are
shown.

## Table schema + presentation decision

Artifacts are data-first, not chart-first:

- `TableArtifact` carries columns, rows, provenance and a JSON `UIDecision`.
- The decision model (Jev-compatible contract) selects `blockType` and, for
  charts, `chartType` (`line`, `bar`, `area`, `pie`, `donut`, `scatter`) plus
  `x`/`y` bindings. `y` may be one column or several for multi-line charts.
- `resolveArtifactBlock` validates the decision against the table schema:
  invalid or incomplete decisions fall back to a semantic table.
- `chartPoints` and `graphData` derive render data from rows. The graph is built
  from edge-source/edge-target columns, not hand-authored node lists.
- This mirrors Open Intelligent UI's routing: tables → A2UI-style table;
  charts/diagrams → Open Generative UI. The native BRH renderer remains the
  fallback and the default while the backend has no `generateSandboxedUi` tool.

## Open Intelligent UI hybrid

The chosen integration is hybrid: keep the LangGraph SDK chat shell and add
CopilotKit/Open Generative UI only for generated visual blocks behind a flag.
The full stack is documented but not enabled by default:

1. Add `@copilotkit/react-core`, `@copilotkit/runtime`, `@ag-ui/client` and
   `zod` (plus `@typesafe-ai/sdk` if using Jev).
2. Add `app/api/copilotkit/[[...slug]]/route.ts` with `CopilotRuntime`,
   `createCopilotRuntimeHandler`, `InMemoryAgentRunner`, a
   `LangGraphAgent`/`LangGraphHttpAgent` pointing at the agent, and
   `openGenerativeUI: { agents: [...] }`.
3. Wrap only the visual surface in `<CopilotKit runtimeUrl="/api/copilotkit"
   openGenerativeUI={...}>`; use headless `useAgent` and
   `useRenderActivityMessage` inside the existing message card.
4. The agent must expose `generateSandboxedUi`; Jev selects table (A2UI) vs
   chart/graph (Open Generative UI). Keys stay server-side:
   `OPENAI_API_KEY`, `TYPESAFE_API_KEY`, `LLM_MODEL=chat-latest`,
   `JEV_MODEL=jev-latest`.
5. If the flag is off, the activity is missing, or validation fails, render the
   native chart/graph/table. Never silently claim that generated UI is live.

## Components

- `components/assistant/assistant-shell.tsx` — state and panel composition
- `components/assistant/sidebar.tsx` — brand, threads, search
- `components/assistant/chat-header.tsx` — title and panel controls
- `components/assistant/chat-panel.tsx` — message list, empty state, composer
- `components/assistant/message.tsx` — user/assistant/refusal rendering
- `components/assistant/sources-panel.tsx` — citation detail
- `lib/chat/types.ts` — local thread/message/citation types
- `lib/chat/demo.ts` — four sourced transcripts + one refusal

Every file stays under 250 lines.

## Non-goals

- Persisting threads to Postgres.
- Real streaming from a deployed graph.
- PDF viewer implementation (the source action is present, but the route is a
  later step).
- Authentication or user accounts.

## Verification

- `bun run typecheck` and `bun run build`.
- `agent-browser` at 1440px and 390px: empty state, thread selection, citation
  selection, composer, mobile drawers, refusal state.
- No console errors.
