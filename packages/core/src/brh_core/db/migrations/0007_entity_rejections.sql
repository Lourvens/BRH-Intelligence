-- Preserve rejected entity proposals and evidence for audit, hide them publicly.
CREATE TABLE IF NOT EXISTS corpus.research_entity_rejections (
    entity_id UUID PRIMARY KEY REFERENCES corpus.research_entities ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    rejected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE OR REPLACE VIEW corpus.research_visible_entities AS
    SELECT e.* FROM corpus.research_entities e WHERE NOT EXISTS (
        SELECT 1 FROM corpus.research_entity_rejections r WHERE r.entity_id=e.entity_id
    );
