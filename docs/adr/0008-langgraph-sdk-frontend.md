# ADR-0008: Frontend consumes the graph via the LangGraph SDK

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

The web app needs to submit a question, stream the answer token-by-token, and
render citations that open source pages. The agent is a LangGraph graph
deployed to LangGraph Platform / LangSmith Deployment (ADR-0009).

The sibling project bridged a FastAPI SSE stream into the Vercel AI SDK's UI
message protocol, then used `useChat`. That works but is a hand-maintained
adapter between two protocols, and it forgoes thread state, interrupts, and
time-travel that the platform provides.

## Decision

Consume the graph with the official **`@langchain/langgraph-sdk` React
`useStream`** hook, pointed at the LangGraph server:

- Streaming answers come from `stream.messages`.
- Citations and the grounded flag come from `stream.values` (graph state).
- Thread state, interrupts, and resume are available from the SDK directly.

We build a small, project-owned chat shell rather than reusing the AI SDK
`ai-elements`, because those components model the AI SDK's message shape, not
LangGraph's.

## Consequences

Easier:

- No protocol adapter to maintain.
- Native streaming, thread persistence, and human-in-the-loop when we add it.
- One source of truth for message state: the graph.

Harder:

- We give up the `ai-elements` component library from the sibling project and
  rebuild the chat UI. Contained: the needed components are small.
- Coupling to the LangGraph SDK's API surface; pinned and updated deliberately.

## Alternatives considered

- **AI SDK `useChat` + a server adapter** (sibling approach). Rejected: an
  adapter to maintain, and we lose platform features.
- **Hand-rolled SSE against the graph's REST API.** Rejected: reinventing the
  SDK.
