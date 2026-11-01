# Chat redesign — proposed design

Status: main layout, theme, activity persistence and final-writer streaming implemented.
Live-provider and visual verification pending; the user will verify visually.
Browser tools are prohibited by the latest instruction.

## Diagnosis

The SDK currently subscribes to values/custom. Only conversational replies emit
brh.answer.delta. Research invokes its model, then publishes a complete answer;
there is no research answer-token stream for the UI to render. The message adapter
hides everything without a validated BRH envelope. Temporary and final messages
use different identities. Activity is transient and lost on reload. Search reports
cumulative citations as passage counts, exposes only the first query of a batch,
and can report complete after a caught tool error. Research failures can leave a
running activity. These are contract issues, not problems solved by CSS animation.

## Proposed interface

A quiet documentary workspace: collapsible history rail, centered 720–800px reading
column, sticky rounded composer, source drawer opened on demand. Use shadcn Sidebar,
Sheet, Collapsible, Tooltip and Button. Preserve existing artifact rendering.
Replace the large open activity box with a compact current-action row and expandable
per-turn timeline. Each tool operation displays its query, filters, real result count,
duration and success/empty/error/cancelled state. Completed activity collapses into
a summary above the answer and remains inspectable. Show executed actions and concise
summaries only, never private chain of thought or simulated progress.

## Dark theme priority

Reduce the current saturated blue background to low-chroma charcoal with a cool
undertone. Separate canvas, reading surface and raised composer with small lightness
steps. Use off-white prose and neutral muted labels; reserve blue for actions/focus,
gold for provenance. Define colors centrally through existing semantic tokens and
check foreground/background pairs in both themes. Retain Inter controls, restrained
Montserrat headings, and Source Serif 4 reading text. Avoid glow, heavy gradients,
blue-tinted paragraphs and excessive bordered cards.

## Stream architecture

Keep the installed LangGraph SDK useStream as the sole transport. Evaluate assistant-ui
as an optional presentation layer only; it must not introduce a second runtime.
Separate research/tool decisions from the final user-visible writer. Stream only
conversation and final-writer messages by node/tag; hide tool-decision text. A whole
answer cannot be validated before its first token is shown: streamed research text
must be explicitly provisional until completion, then commit or replace it with the
validation result. Do not call a provisional answer validated. Keep source references
noninteractive until resolved. Preserve one message ID through streaming and final
publication. This publication-policy change needs an ADR before implementation.

Custom activity events need run/turn/message/operation IDs, sequence and terminal status.
Maintain a typed reducer with replay deduplication and stale-run rejection. Reconstruct
completed turns from checkpointed public activity, not only transient events. Distinguish
retrieving, writing, verifying, done, stopped and failed. Cancellation rejects late events;
incomplete text remains visibly incomplete and never becomes a saved successful answer.

## Motion and verification

Render actual token arrivals with small frame-batched updates, without artificial typing
delays. Use 120–180ms presence transitions for activity rows and expansion. Keep message
keys stable, respect reduced motion, retain scroll position when reading older messages,
and provide a jump-to-latest control. Announce phase changes rather than every token.

Implement in order: event/publication contract and tests; theme and layout; tool timeline;
streamed writer and message reconstruction; citations/actions; responsive and interruption
verification. Test real SSE arrival before run completion, replay, reload, duplicate events,
late tokens, retries, invalid citations, no results, network failure and reduced motion.
Use Playwright for browser checks if available. Do not use agent-browser.

## Sources

- https://docs.langchain.com/oss/javascript/langgraph/streaming
- https://www.assistant-ui.com/docs/runtimes/langgraph/overview
- https://www.assistant-ui.com/components
- https://ui.shadcn.com/docs/theming
