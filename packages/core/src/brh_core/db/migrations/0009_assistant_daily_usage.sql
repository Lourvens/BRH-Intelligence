-- Daily assistant token ledger (ADR-0029).
--
-- One row per completed graph turn. The turn id is the idempotency key, so a
-- replayed graph or a node retry never charges the same turn twice. The daily
-- total is a SUM over the identity/date index; no counter row can drift.

CREATE TABLE IF NOT EXISTS corpus.assistant_daily_usage (
    turn_id       TEXT PRIMARY KEY,
    identity      TEXT NOT NULL,
    usage_date    DATE NOT NULL,
    input_tokens  BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_daily_usage_identity_date_idx
    ON corpus.assistant_daily_usage (identity, usage_date);
