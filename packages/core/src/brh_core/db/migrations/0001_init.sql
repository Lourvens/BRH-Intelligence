-- BRH Intelligence corpus schema (ADR-0003).
--
-- Postgres is the system of record for the corpus: documents, their pages,
-- their chunks, and the ingestion job ledger. Pinecone holds only vectors and
-- a small display payload, keyed by chunk_id.
--
-- Conventions:
--   * schema 'corpus' keeps our tables namespaced on a shared instance.
--   * every migration is idempotent (IF NOT EXISTS) and append-only.
--   * uniqueness is enforced here, not in Python, so re-runs are safe.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS corpus;

SET search_path TO corpus, public;

-- migrations ledger ---------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- documents: one row per unique source artefact ----------------------
CREATE TABLE IF NOT EXISTS documents (
    document_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sha256           CHAR(64) NOT NULL UNIQUE,
    slug             TEXT NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    source_kind      TEXT NOT NULL DEFAULT 'pdf_local'
        CHECK (source_kind IN ('pdf_local', 'pdf_web', 'web_html')),
    language         TEXT NOT NULL DEFAULT 'fr'
        CHECK (language IN ('fr', 'ht', 'en', 'other')),
    publisher        TEXT NOT NULL DEFAULT 'BRH',
    source_path      TEXT,
    source_url       TEXT,
    volume           TEXT,
    issue            TEXT,
    publication_date DATE,
    page_count       INTEGER NOT NULL DEFAULT 0 CHECK (page_count >= 0),
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_last_seen_idx ON documents (last_seen_at);

-- pages: one row per (document, page) -------------------------------
CREATE TABLE IF NOT EXISTS pages (
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number >= 1),
    text        TEXT NOT NULL,
    PRIMARY KEY (document_id, page_number)
);

-- chunks: one retrievable passage, bound to one page ---------------
CREATE TABLE IF NOT EXISTS chunks (
    chunk_id    TEXT PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number >= 1),
    ordinal     INTEGER NOT NULL CHECK (ordinal >= 0),
    text        TEXT NOT NULL,
    char_count  INTEGER NOT NULL CHECK (char_count >= 0),
    UNIQUE (document_id, page_number, ordinal)
);

CREATE INDEX IF NOT EXISTS chunks_document_idx ON chunks (document_id);

-- processing_jobs: append-only ledger of ingestion work ------------
CREATE TABLE IF NOT EXISTS processing_jobs (
    job_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    stage           TEXT NOT NULL
        CHECK (stage IN ('download', 'extract', 'chunk', 'embed', 'index')),
    idempotency_key TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'succeeded'
        CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    attempt         INTEGER NOT NULL DEFAULT 1 CHECK (attempt >= 1),
    error           TEXT,
    metrics         JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- At most one row per (document, stage, key): re-runs with the same key are
-- no-ops; a newer key (new chunker or embed model) gets a fresh row.
CREATE UNIQUE INDEX IF NOT EXISTS processing_jobs_idempotency_uidx
    ON processing_jobs (document_id, stage, idempotency_key);

CREATE INDEX IF NOT EXISTS processing_jobs_doc_stage_idx
    ON processing_jobs (document_id, stage, started_at DESC);
