# ADR-0027: LangSmith tracing for the agent

- **Status**: Accepted
- **Date**: 2026-11-03
- **Supersedes**: ADR-0018 (Arize AX), ADR-0022 (opt-in Arize trace content)

## Context

ADR-0009 selected LangSmith for observability. ADR-0018 moved agent runtime
traces to Arize AX with `arize-otel` and OpenInference, and ADR-0022 added
`BRH_TRACE_CONTENT` to opt into content export. That stack duplicated the
observability backend, added three direct dependencies and a custom
instrumentation module, and required its own redaction flags. LangGraph and
LangChain already emit structured traces to LangSmith through their native
callback integration when tracing is enabled.

## Decision

- Remove `arize-otel`, `openinference-instrumentation-langchain` and
  `opentelemetry-api` as agent dependencies, and delete `brh_agent.telemetry`.
- Remove `ARIZE_API_KEY`, `ARIZE_SPACE_ID`, `ARIZE_PROJECT_NAME`,
  `BRH_TRACE_CONTENT` and the `OPENINFERENCE_HIDE_*` flags from the environment.
- Enable tracing with `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`,
  `LANGSMITH_AGENT_ID=brh-intelligence` and
  `LANGSMITH_AGENT_ENVIRONMENT=local`. The workspace is agent-based, so traces
  land in `brh-intelligence-local`; do not set the legacy `LANGSMITH_PROJECT`
  destination. `langgraph dev` loads the root `.env` through
  `services/agent/langgraph.json`.
- Let LangChain/LangGraph emit the spans; no application instrumentation code.
- Keep the LangSmith MCP as a developer inspection tool; it is not a second
  exporter.

## Privacy boundary

LangSmith captures inputs and outputs by default. No hide flags are set, so
traces include questions, prompts, model messages, model outputs and retrieved
corpus context. Operators who need metadata-only traces set
`LANGSMITH_HIDE_INPUTS=true` and `LANGSMITH_HIDE_OUTPUTS=true`. This replaces the
ADR-0022 `BRH_TRACE_CONTENT` gate.

## Consequences

- One tracing backend and no custom instrumentation to maintain.
- Dependency count drops; `langgraph`/`langchain` already depend on LangSmith.
- Span naming and payload shape follow LangSmith's native LangGraph integration,
  not the OpenInference conventions used in earlier Arize traces.
- Historical Arize data is not migrated; deleting the old Arize project and
  datasets is an operator action.
- Agent addressing is workspace-scoped and currently beta: a workspace without
  it rejects the run instead of falling back to a project. This workspace has
  the four agent environments, so the agent pair is the reliable destination.
- Agent addressing needs `langsmith>=0.14.9` and `langchain-core>=1.6.11`.
  Earlier releases attach the default project/session to the same run and the
  server rejects it with "Address the run by Agent, or by session_id or
  session_name, but not both". The dependency floors encode that requirement.
