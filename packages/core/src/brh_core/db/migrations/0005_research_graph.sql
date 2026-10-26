-- Rebuildable OCR reading/search projection, independent of embedding progress.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config c JOIN pg_namespace n ON n.oid=c.cfgnamespace
                   WHERE c.cfgname='research_french' AND n.nspname='corpus') THEN
        CREATE TEXT SEARCH CONFIGURATION corpus.research_french (COPY=pg_catalog.french);
        ALTER TEXT SEARCH CONFIGURATION corpus.research_french
            ALTER MAPPING FOR hword, hword_part, word WITH public.unaccent, french_stem;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS corpus.research_documents (
    document_id UUID PRIMARY KEY,
    sha256 CHAR(64) NOT NULL UNIQUE,
    artifact_hash CHAR(64) NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    family TEXT NOT NULL DEFAULT 'unknown',
    period_label TEXT,
    period_years INTEGER[] NOT NULL DEFAULT '{}',
    publication_date DATE,
    date_basis TEXT NOT NULL DEFAULT 'unknown',
    uploaded_at TIMESTAMPTZ,
    source_urls TEXT[] NOT NULL DEFAULT '{}',
    page_count INTEGER NOT NULL CHECK (page_count>0),
    figure_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    editorial JSONB NOT NULL DEFAULT '{}',
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    title_search TSVECTOR GENERATED ALWAYS AS
        (to_tsvector('corpus.research_french'::regconfig, title)) STORED
);
CREATE INDEX IF NOT EXISTS research_documents_title_idx
    ON corpus.research_documents USING GIN(title_search);
CREATE INDEX IF NOT EXISTS research_documents_family_idx ON corpus.research_documents(family);
CREATE INDEX IF NOT EXISTS research_documents_years_idx
    ON corpus.research_documents USING GIN(period_years);

CREATE TABLE IF NOT EXISTS corpus.research_pages (
    document_id UUID NOT NULL REFERENCES corpus.research_documents ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number>=1),
    markdown TEXT NOT NULL,
    search_text TSVECTOR GENERATED ALWAYS AS
        (to_tsvector('corpus.research_french'::regconfig, markdown)) STORED,
    PRIMARY KEY(document_id, page_number)
);
CREATE INDEX IF NOT EXISTS research_pages_search_idx ON corpus.research_pages USING GIN(search_text);

CREATE TABLE IF NOT EXISTS corpus.research_entities (
    entity_id UUID PRIMARY KEY,
    label TEXT NOT NULL,
    kind TEXT NOT NULL,
    normalized_label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS research_entities_label_idx
    ON corpus.research_entities(normalized_label text_pattern_ops);
CREATE TABLE IF NOT EXISTS corpus.research_aliases (
    entity_id UUID NOT NULL REFERENCES corpus.research_entities ON DELETE CASCADE,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    reviewed BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY(entity_id, normalized_alias)
);
CREATE INDEX IF NOT EXISTS research_aliases_lookup_idx ON corpus.research_aliases(normalized_alias);
CREATE TABLE IF NOT EXISTS corpus.research_mentions (
    mention_id UUID PRIMARY KEY,
    entity_id UUID NOT NULL REFERENCES corpus.research_entities,
    document_id UUID NOT NULL,
    page_number INTEGER NOT NULL,
    artifact_hash CHAR(64) NOT NULL,
    surface TEXT NOT NULL,
    quote TEXT NOT NULL,
    FOREIGN KEY(document_id, page_number) REFERENCES corpus.research_pages ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS research_mentions_entity_idx
    ON corpus.research_mentions(entity_id, document_id, page_number);
CREATE TABLE IF NOT EXISTS corpus.research_assertions (
    assertion_id UUID PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES corpus.research_entities,
    object_id UUID NOT NULL REFERENCES corpus.research_entities,
    predicate TEXT NOT NULL,
    document_id UUID NOT NULL,
    page_number INTEGER NOT NULL,
    artifact_hash CHAR(64) NOT NULL,
    quote TEXT NOT NULL,
    temporal_context TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending','accepted','rejected')),
    probability DOUBLE PRECISION CHECK(probability>=0 AND probability<=1),
    provenance JSONB NOT NULL DEFAULT '{}',
    FOREIGN KEY(document_id, page_number) REFERENCES corpus.research_pages ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS research_assertions_subject_idx
    ON corpus.research_assertions(subject_id, status);
CREATE INDEX IF NOT EXISTS research_assertions_object_idx
    ON corpus.research_assertions(object_id, status);
CREATE TABLE IF NOT EXISTS corpus.research_extraction_runs (
    run_key TEXT PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES corpus.research_documents ON DELETE CASCADE,
    artifact_hash CHAR(64) NOT NULL,
    page_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running','succeeded','failed')),
    proposal JSONB,
    provenance JSONB NOT NULL DEFAULT '{}',
    error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
