# ADR-0022: Opt-in Arize trace content for agent debugging

- **Status**: Accepted
- **Date**: 2026-10-29
- **Amends**: ADR-0018

## Context

The metadata-only policy in ADR-0018 intentionally replaced every input and
output with `__REDACTED__`. The user requested inspectable messages and model
responses while testing the agent, authorizing content export to the configured
Arize project. This changes the privacy boundary explicitly rather than silently
relying on instrumentation defaults.

## Decision

- Add `BRH_TRACE_CONTENT`, default false. False retains metadata-only traces;
  true exports graph inputs/outputs, LLM messages/prompts, decisions and corpus
  context sent to the model. Enable it in the operator's ignored local `.env`.
- Use explicit OpenInference `TraceConfig` and matching environment settings so
  old `OPENINFERENCE_HIDE_*` values cannot silently mask an opted-in trace.
- Continue hiding invocation parameters, tool definitions, image inputs and
  embedding text/vectors. Provider authorization headers and settings objects
  are never attached as trace attributes. Content mode is not permission to log
  configured credentials.
- Attach Jev spans to the active LangChain span through the supported
  `get_current_span()` bridge. Give them OpenInference LLM input/output fields
  under the same opt-in policy, and mark successful requests OK.
- Restart Agent Server after changing the setting. Already redacted historical
  spans remain redacted; only newly captured traces gain content.

## Consequences

Arize can display the exact messages and outputs needed for debugging, including
source excerpts and user conversation content. Operators control when that data
is sent to Arize; the environment template keeps the previous private default.
Graph, chat and Jev operations share one trace tree. This supersedes ADR-0018's
unconditional content-hiding rule while retaining its exporter/lifecycle design.
