# ADR-0009: LangSmith for observability and deploy

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

We need to (a) see what the agent actually did on a bad answer — which chunks
were retrieved, what the prompt was — and (b) deploy the graph without
building a bespoke serving layer. The brief named LangSmith Deployment.

## Decision

- **Observability**: LangSmith tracing, enabled by `LANGCHAIN_TRACING_V2` +
  `LANGCHAIN_API_KEY` + `LANGCHAIN_PROJECT`. Every graph run is traced,
  including retrieval and the refusal decision.
- **Deploy**: the graph ships with `langgraph.json` and deploys to LangGraph
  Platform / LangSmith Deployment. Local dev uses `langgraph dev`.
- The web app points at either the local dev URL or the deployed URL via
  `NEXT_PUBLIC_LANGGRAPH_URL`.

## Consequences

Easier:

- Traces answer "why did it say that" without custom logging.
- Deployment is a config file, not infrastructure.
- Thread persistence comes with the platform.

Harder:

- A vendor dependency for observability and hosting. Acceptable: the graph is
  portable (it is standard LangGraph) and can run on any container.
- Traces may contain document text. Both are public BRH documents, so this is
  not a data-protection problem; noted for completeness.

## Alternatives considered

- **Self-hosted observability (Phoenix, sibling project).** Kept in mind, but
  LangSmith is the stated target and reduces moving parts.
- **A bespoke FastAPI serving layer.** Rejected: the platform already streams,
  checkpoints, and scales.
