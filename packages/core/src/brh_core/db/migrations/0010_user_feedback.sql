-- Durable, anonymous user feedback and its administrative review state.
CREATE TABLE IF NOT EXISTS corpus.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('inaccuracy', 'bug', 'suggestion', 'other')),
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 4000),
    page_path TEXT NOT NULL CHECK (char_length(page_path) BETWEEN 1 AND 500),
    thread_id TEXT CHECK (char_length(thread_id) <= 100),
    answer_excerpt TEXT CHECK (char_length(answer_excerpt) <= 2000),
    identity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved')),
    admin_note TEXT NOT NULL DEFAULT '' CHECK (char_length(admin_note) <= 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_feedback_status_created_idx
    ON corpus.user_feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS user_feedback_identity_created_idx
    ON corpus.user_feedback (identity, created_at DESC);
