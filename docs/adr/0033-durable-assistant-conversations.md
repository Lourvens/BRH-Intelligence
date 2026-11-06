# ADR-0033: Durable assistant conversations in Postgres

Status: Accepted

## Context

Assistant threads identified a real gap between what the system stores and what
the server remembers.

The Agent Server (`langgraph_api` 0.17) is started with `langgraph dev`, which
runs the **in-memory runtime** (`langgraph_runtime_inmem`). Its thread rows,
runs and queue are process state, flushed to a local `.langgraph_api` directory;
a new deployment or a different machine starts with none of them. The
`POSTGRES_URI` runtime that makes the Agent Server itself durable is a
self-hosted/enterprise packaging concern, not something this repository can
enable with configuration.

Conversely, the graph state is already durable: `langgraph.json` installs
`persistence/checkpointer.py:create_checkpointer`, an `AsyncPostgresSaver`
against the Neon database (ADR-0003's Postgres). Every turn's messages, title,
citations and usage are in `public.checkpoints` / `checkpoint_blobs`.

The web app kept thread ids in `sessionStorage`, so the sidebar disappeared with
the tab, and after a restart every stored id 404'd even though its state was
still in Postgres. That 404 was then rendered as "assistant momentarily
unavailable" (ADR-0032).

## Decision

1. **Message state stays in the checkpointer.** No second copy of the
   conversation is written. The checkpointer remains the single source of truth.
2. **Add the durable index the runtime lacks**: `corpus.assistant_threads`
   (`thread_id`, anonymous `owner`, `title`, timestamps), applied by migration
   `0011_assistant_threads.sql`.
3. **Re-attach, do not recreate.** On opening a conversation the agent service
   ensures the runtime knows the thread: `GET /threads/{id}`; if the response
   lacks `metadata.graph_id` it patches it; if the runtime has forgotten the
   row entirely it creates it with `thread_id` supplied by us, `if_exists:
   "do_nothing"` and `metadata.graph_id = "agent"`. The checkpointer then
   restores the conversation, including the context for follow-up questions.
   This re-attachment was verified against real checkpoints.
4. **Ownership is a browser cookie**, not the IP-derived quota identity: the
   Next middleware issues `brh-assistant-owner` (httpOnly, one year), the BFF
   forwards it as `x-assistant-owner`, and the agent service scopes every index
   read/write/delete to it. Conversations of people behind one NAT stay apart.
5. **The index is the sidebar; the transcript is the checkpointer.** The web
   loads the list from `GET /api/assistant/threads`, writes provisional and
   generated titles, deletes on "Retirer de l'historique", and falls back to the
   local cache only when the service is unreachable.
6. **A shared thread URL still opens** when the runtime knows the thread; an
   unknown id is never used to create a thread for a visitor who does not own it.

## Consequences

- Conversations survive restarts, redeploys and browser sessions on the same
  browser. A new browser starts with an empty list, because there are no
  accounts; opening a known thread URL still works while the runtime has it.
- Losing the owner cookie (cleared storage, another device) hides the index but
  does not destroy the conversation: the checkpoints remain and the URL can
  still be re-attached when the runtime knows it, or after the id is registered
  again by an owner.
- The registry title is best-effort: if the tab closes mid-run the row keeps its
  provisional title until the graph title is next written.
- `langgraph dev` also persists its runtime to disk, so a local restart can mask
  the re-attachment path; the behaviour matters on ephemeral deployments (Modal)
  and was tested against a fresh runtime.
- Deleting from the index does not delete checkpoints. A retention/cleanup task
  for `public.checkpoints` is still needed to bound storage.
- The custom checkpointer is missing `adelete_for_runs` and `acopy_thread`, so
  `multitask_strategy='rollback'` can leave rolled-back state visible until the
  next completed run (the server logs this warning).
