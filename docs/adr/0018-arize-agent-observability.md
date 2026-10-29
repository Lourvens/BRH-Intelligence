# ADR-0018: Arize AX for agent observability

- **Status**: Accepted
- **Date**: 2026-10-28
- **Amended**: ADR-0022 adds explicitly opted-in trace content; the policy below
  remains the default when `BRH_TRACE_CONTENT=false`.

## Context

ADR-0009 selected LangSmith for tracing and deployment. The graph still uses
the LangGraph Agent Server and may still be deployed on LangSmith, but agent
runtime traces now need to be inspected in Arize AX. Default OpenInference
instrumentation can include user questions, prompts, answers and retrieved
document text, so changing exporters also requires an explicit data boundary.

## Decision

- Export agent runtime spans to Arize AX with `arize-otel` and
  `openinference-instrumentation-langchain`.
- Initialize instrumentation once, before graph execution, and use batched OTLP
  export. Flush the provider during the Agent Server lifespan shutdown.
- Configure the destination with `ARIZE_API_KEY`, `ARIZE_SPACE_ID` and
  `ARIZE_PROJECT_NAME`.
- Enforce OpenInference redaction for inputs, outputs, messages, invocation
  parameters, tool definitions, prompts, choices, embedding text/vectors and
  retrieval documents. Traces retain graph/span structure, latency, failures,
  token usage and model metadata.
- Give the custom Jev Decisions HTTP client an OpenTelemetry child span with
  only its model name and question count; never attach its state or response.
- Keep the LangSmith MCP available as an optional developer inspection tool.
  It is not the runtime exporter. This decision supersedes only the
  observability part of ADR-0009, not its deployment choice.

## Consequences

Arize can show the agent's execution shape and operational health without
receiving conversation or corpus content. Content-level prompt debugging is
intentionally unavailable. Enabling it later requires a separate explicit
privacy decision, not merely changing an environment variable.
