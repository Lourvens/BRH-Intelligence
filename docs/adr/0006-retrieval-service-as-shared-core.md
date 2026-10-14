# ADR-0006: Retrieval service as the shared core

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

Three consumers need retrieval: the LangGraph agent, the MCP server, and (for
evaluation) our own test harness. If each wires its own search, they will
disagree about ranking, filtering, citation shape, and the "no good match"
threshold — and the platform's promise erodes.

## Decision

`brh_core.retrieval.RetrievalService` is the **only** entry point for semantic
search. It exposes:

```python
retrieve(question, top_k) -> list[RetrievedChunk]
```

and owns:

- calling the vector store (interface in `brh_core.vectorstore`),
- assembling citations from Postgres (document title/slug/page/pdf link),
- deduplicating chunks from the same page,
- applying the minimum-score threshold that drives the agent's refusal branch.

The LangGraph agent and the MCP server both call this. Neither talks to
Pinecone or Postgres for reads directly.

## Consequences

Easier:

- One place to change ranking, filtering, or citation shape.
- The agent's refusal is an evaluation of `RetrievalService` output, so the
  same numbers the MCP server returns.
- Trivially replaceable with a fake in tests (see `vectorstore/memory.py`).

Harder:

- A service layer to maintain. Small: it is a few hundred lines at most, split
  by responsibility.
- The interface must stay stable across two services; changes are versioned by
  the ADR process.

## Alternatives considered

- **Each surface queries Pinecone directly.** Rejected: guaranteed drift.
- **A separate retrieval microservice.** Rejected for v1: an HTTP hop for a
  local function call, at this scale, buys nothing.
