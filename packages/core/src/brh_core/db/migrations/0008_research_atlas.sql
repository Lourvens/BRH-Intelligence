-- Bounded overview and evidence reads; existing publications remain unchanged.
CREATE INDEX IF NOT EXISTS research_mentions_document_entity_idx
    ON corpus.research_mentions(document_id,entity_id,artifact_hash);
CREATE INDEX IF NOT EXISTS research_assertions_accepted_document_idx
    ON corpus.research_assertions(document_id,artifact_hash) WHERE status='accepted';
