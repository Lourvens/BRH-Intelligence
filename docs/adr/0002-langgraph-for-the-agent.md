# ADR-0002: LangGraph for the agent

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

The assistant must answer questions over BRH documents, cite sources, and say
when the documents do not support an answer. It will grow to need
human-in-the-loop review, retries, and eventually multi-step research. The
first version must be simple enough to reason about.

We need a framework where control flow is explicit, state is typed, and the
deployment story is boring.

## Decision

Build the answer workflow as an explicit **LangGraph** `StateGraph`:

```
START ──► retrieve ──► (route) ──► generate ──► END
                            └─────► refuse   ──► END
```

- Typed state (`Question`, retrieved citations, answer, grounded flag).
- Retrieval is a node, not a hidden tool call — the refusal branch inspects
  the retrieved evidence directly.
- Deploys via LangGraph Platform / LangSmith Deployment with `langgraph.json`.
- Observability through LangSmith (ADR-0009).

## Consequences

Easier:

- The graph *is* the documentation of the workflow.
- Checkpointing, interrupts, and time-travel are available when we need them,
  without a rewrite.
- A deterministic refusal path — if retrieval returns nothing above threshold,
  we do not call the model to "answer" from nothing.

Harder:

- More structure than a single prompt for a trivial case. Accepted: the
  structure is what lets us grow.
- LangGraph's API surface moves; we pin versions and keep node bodies small.

## Alternatives considered

- **A thin chain (retrieve → stuff → generate).** Rejected: no clean place for
  the refusal/quality gate, no path to checkpointing.
- **A free-form ReAct tool-calling agent.** Rejected for v1: harder to test,
  and it can loop expensive tool calls without adding value on a single-corpus
  question. We can add an agent node later *inside* this graph.
- **LlamaIndex workflows** (used by the sibling project). Rejected: we are
  standardising on LangChain/LangGraph per the project brief.
