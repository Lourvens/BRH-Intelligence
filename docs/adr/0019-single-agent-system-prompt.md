# ADR-0019: One system prompt for the agent identity

- **Status**: Accepted
- **Date**: 2026-10-29

## Context

The chat model is reused for conversation, planning, query refinement and
grounded answer drafting. Each task previously supplied its own
`SystemMessage`; two user-facing tasks separately defined the assistant's
identity and applied conflicting language rules. The constant named
`SYSTEM_PROMPT` was only the answer-writing instruction, not a global agent
contract.

LangChain accepts an ordered list of typed messages, while LangGraph keeps the
real conversation in an `add_messages` state channel. Internal task
instructions do not belong in that durable conversation history.

## Decision

- Define the agent's identity, goal and invariant rules once, in French, in
  `AGENT_PROMPT`.
- Send `AGENT_PROMPT` as the only `SystemMessage` on every chat-model call.
- Send bounded real human/assistant history after the system message, followed
  by the node's French task instruction and runtime input together as one
  ephemeral `HumanMessage`.
- Do not persist internal task messages in LangGraph state. Persist only real
  human and assistant conversation messages.
- Keep task prompts free of alternate identities. Conversation, planning,
  refinement and answer drafting describe work, not personalities.
- Write Jev decision instructions in French as well. Schema field names and
  enum values remain stable implementation contracts.

## Consequences

Every chat-model call receives one consistent identity and safety boundary.
Task behavior remains node-specific without accumulating internal prompts in
checkpoints or exposing them as conversation. Prompt changes now have a clear
ownership boundary: permanent behavior changes belong in `AGENT_PROMPT`, while
workflow-specific changes belong in a task prompt.

The system prompt is repeated on each stateless provider invocation, as required
by chat-model APIs, but there is only one system-prompt definition. Task
instructions use the human role for broad provider compatibility; the runtime
JSON envelope distinguishes internal instructions from user-supplied data.
