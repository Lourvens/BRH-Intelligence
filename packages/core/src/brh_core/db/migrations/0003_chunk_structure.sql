-- Structure-aware chunks (chunking strategy v1).
--
-- A chunk is no longer necessarily a slice of one page: a section or a table can
-- span a page boundary, so `page_end` completes `page_number` (which stays the
-- citation target, ADR-0005). The other columns carry what the inspection
-- report needs and what retrieval uses to rejoin a partitioned table:
-- `metadata` holds table_id, part, part_count, row range, envelope and the
-- prev/next links.
--
-- Append-only and idempotent, like every migration here.

SET search_path TO corpus, public;

ALTER TABLE chunks ADD COLUMN IF NOT EXISTS page_end     INTEGER;
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS chunk_type   TEXT NOT NULL DEFAULT 'prose';
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS section_path TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS token_count  INTEGER;
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS metadata     JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chunks_page_end_check') THEN
        ALTER TABLE chunks ADD CONSTRAINT chunks_page_end_check
            CHECK (page_end IS NULL OR page_end >= page_number);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chunks_chunk_type_check') THEN
        ALTER TABLE chunks ADD CONSTRAINT chunks_chunk_type_check
            CHECK (chunk_type IN ('prose', 'table', 'series', 'provision'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS chunks_type_idx ON chunks (chunk_type);
CREATE INDEX IF NOT EXISTS chunks_table_idx ON chunks ((metadata ->> 'table_id'));
