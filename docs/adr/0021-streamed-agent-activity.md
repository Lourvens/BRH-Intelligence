# ADR-0021: Temporary activity UI over the LangGraph SDK stream

- **Status**: Accepted
- **Date**: 2026-10-29

## Context

The UI showed a static search icon and spinner for all requests and treated
thread restoration as agent execution. State values are returned after a node
finishes, so they cannot accurately indicate when a long operation begins.
Users need to see the plan, actual searches, retrieved passages and review
stages while a run executes.

Context7 and Exa research identified shadcn AI Elements task/trace compositions,
assistant-ui, and LangGraph custom event streaming:

- [shadcn AI Elements](https://ui.shadcn.com/docs/ai-elements)
- [LangChain UI integration](https://docs.langchain.com/oss/javascript/langchain/frontend/integrations/ai-elements)
- [LangGraph custom streaming](https://docs.langchain.com/oss/python/langgraph/streaming)

## Decision

- Keep `@langchain/langgraph-sdk/react` as the single frontend stream/session
  runtime. Compose the activity panel with existing shadcn Button/Collapsible
  primitives, following AI Elements task/trace patterns without adding another
  chat runtime or migrating to the AI SDK.
- Emit `brh.activity` custom events through `get_stream_writer()` at operation
  start/end. Include a turn ID, stable operation ID, stage and status. Allow
  only public goals, actual query text, coverage summaries and bounded source
  previews. Never include model drafts, prompts, hidden reasoning or exceptions.
- Subscribe to `values` and `custom`; use `onCustomEvent` for transient activity
  while state values and validated final messages remain authoritative.
- Merge operation updates by ID so parallel retrieval does not lose results.
  Reject unknown events, other-turn events and replayed start events. Clear
  activity on submit/thread switch and ignore late events after cancellation.
- Show a temporary expandable activity panel. Display retrieved passages as
  candidates awaiting verification; do not treat them as final citations.
  Remove the panel when the response arrives; retain interrupted/error feedback
  until another action. Distinguish thread restoration from an active run.
- Preserve the send/stop button's DOM identity, accessible status announcements,
  reduced-motion behavior and scroll-follow opt-out. Avoid invented percentages
  or timed progress. Technical state remains understandable without animation.

## Consequences

Agent work becomes visible before model calls finish, with no extra model calls
or new UI dependencies. Temporary source previews are sent only to the requesting
client; Arize tracing redaction is unchanged. Activity is not conversation memory
and is not restored as chat content. Reconnection may replay events, so the
client reducer must remain idempotent. Browser visual verification is separate
from stream integration, rendered component tests and production build checks.
