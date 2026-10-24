-- Durable intent survives content replacement and remote acknowledgement gaps.
-- No document FK: intent may be saved before the first document transaction.
CREATE TABLE IF NOT EXISTS corpus.index_manifests (
    target TEXT NOT NULL,
    document_id UUID NOT NULL,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (target, document_id)
);
