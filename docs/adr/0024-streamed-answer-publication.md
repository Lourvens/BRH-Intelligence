# ADR 0024: Stream provisional final answers

Date: 2026-10-31. Status: accepted by the approved chat redesign.

Research decisions remain private. Once research finishes, a separate writer streams
user-visible text through LangGraph custom events. Text is provisional until citation
marker validation completes. The published message replaces the provisional text with
the same ID. The stream includes turn identity and sequence for deduplication.
No claim-level verification is implied. Invalid citations replace the provisional
answer with the existing limitation response. Conversation uses the same identity.
