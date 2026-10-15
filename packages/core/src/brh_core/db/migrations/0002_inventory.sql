-- BRH web inventory ledger (ADR-0003; design: docs/plans/2026-10-14-brh-inventory-design.md).
--
-- The inventory is the *front half* of the corpus pipeline. It records what we
-- have seen on brh.ht and what we did about it, before any parsing. It is
-- deliberately separate from `documents`: that table holds parsed artefacts,
-- keyed by content hash, and is populated by the ingestion stage.
--
-- Two tables:
--   * crawl_runs  — one row per inventory run (bulk backfill or incremental).
--   * crawl_urls  — one row per *URL* ever seen; the current state of that URL.
--
-- Identity. A URL is unique. The bytes behind it are identified by `sha256`,
-- so many URLs may reference the same content-addressed file on disk. Nothing
-- is ever downloaded twice when its (last_modified, content_length) is unchanged.

-- crawl_runs: one run of the inventory --------------------------------
CREATE TABLE IF NOT EXISTS corpus.crawl_runs (
    crawl_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope        TEXT NOT NULL,
    mode         TEXT NOT NULL CHECK (mode IN ('bulk', 'incremental')),
    watermark    TIMESTAMPTZ,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at  TIMESTAMPTZ,
    status       TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'succeeded', 'failed')),
    counts       JSONB NOT NULL DEFAULT '{}'::jsonb,
    error        TEXT
);

CREATE INDEX IF NOT EXISTS crawl_runs_started_idx ON corpus.crawl_runs (started_at DESC);

-- crawl_urls: current state of every URL ever discovered ---------------
CREATE TABLE IF NOT EXISTS corpus.crawl_urls (
    url            TEXT PRIMARY KEY,
    wp_id          INTEGER,
    slug           TEXT,
    title          TEXT,
    wp_date        TIMESTAMPTZ,          -- WordPress published date (GMT)
    wp_modified    TIMESTAMPTZ,          -- WordPress modified date (GMT) — the incremental watermark
    status         TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'downloaded', 'unchanged', 'failed', 'gone')),
    http_status    INTEGER,
    last_modified  TIMESTAMPTZ,          -- server Last-Modified (change hint; no ETag on brh.ht)
    content_length BIGINT,
    sha256         CHAR(64),             -- content hash, set once downloaded
    raw_path       TEXT,                 -- content-addressed file on disk
    first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    fetched_at     TIMESTAMPTZ,
    last_run_id    UUID REFERENCES corpus.crawl_runs(crawl_run_id) ON DELETE SET NULL,
    error          TEXT
);

CREATE INDEX IF NOT EXISTS crawl_urls_sha256_idx ON corpus.crawl_urls (sha256);
CREATE INDEX IF NOT EXISTS crawl_urls_status_idx ON corpus.crawl_urls (status);
CREATE INDEX IF NOT EXISTS crawl_urls_wp_modified_idx ON corpus.crawl_urls (wp_modified DESC);
