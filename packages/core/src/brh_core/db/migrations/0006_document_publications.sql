-- Immutable bundles are uploaded before current pages/pointers are promoted.
CREATE TABLE IF NOT EXISTS corpus.research_publications (
    document_id UUID NOT NULL REFERENCES corpus.research_documents ON DELETE CASCADE,
    publication_id CHAR(64) NOT NULL,
    artifact_hash CHAR(64) NOT NULL,
    storage_backend TEXT NOT NULL CHECK (storage_backend IN ('local','s3')),
    manifest JSONB NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (document_id, publication_id)
);
ALTER TABLE corpus.research_documents ADD COLUMN IF NOT EXISTS publication_id CHAR(64);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conname='research_documents_publication_fk'
        AND conrelid='corpus.research_documents'::regclass) THEN
        ALTER TABLE corpus.research_documents ADD CONSTRAINT research_documents_publication_fk
        FOREIGN KEY (document_id,publication_id)
        REFERENCES corpus.research_publications(document_id,publication_id)
        DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS research_publications_date_idx
    ON corpus.research_publications(published_at DESC);
