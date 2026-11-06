-- Durable conversation index for the assistant (ADR-0033).
--
-- The LangGraph Agent Server keeps thread rows in its in-memory runtime, so a
-- restart or a new deployment loses the thread list while the conversations
-- themselves stay in the Postgres checkpointer (public.checkpoints). This table
-- is the durable index the server lacks: one row per conversation, scoped to
-- the anonymous browser owner, with the display title the graph already
-- generates. Message state is never duplicated here.

CREATE TABLE IF NOT EXISTS corpus.assistant_threads (
    thread_id  UUID PRIMARY KEY,
    owner      TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT 'Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_threads_owner_updated_idx
    ON corpus.assistant_threads (owner, updated_at DESC);
