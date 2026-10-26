"""Transactional checkpoints and idempotent evidence-graph writes."""

from uuid import NAMESPACE_URL, uuid5

from psycopg.types.json import Jsonb

from brh_core.corpus.metadata import normalize


def graph_id(value: str) -> str:
    return str(uuid5(NAMESPACE_URL, "brh:research:" + value))


class ResearchExtractionRepository:
    def __init__(self, pool):
        self.pool = pool

    def lock(self, document_id):
        from brh_core.db.index_manifest import PostgresIndexLedger

        return PostgresIndexLedger(self.pool).lock("research:" + document_id)

    def checkpoint(
        self, key, document, page, *, status, proposal=None, provenance=None, error=None
    ):
        with self.pool.connection() as conn:
            conn.execute(
                """INSERT INTO corpus.research_extraction_runs
                (run_key,document_id,artifact_hash,page_number,status,proposal,provenance,error)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(run_key) DO UPDATE SET
                status=EXCLUDED.status, proposal=coalesce(EXCLUDED.proposal,
                    research_extraction_runs.proposal),
                provenance=research_extraction_runs.provenance || EXCLUDED.provenance,
                error=EXCLUDED.error,updated_at=now()""",
                (
                    key,
                    document.document_id,
                    document.artifact_hash,
                    page,
                    status,
                    Jsonb(proposal.model_dump(mode="json")) if proposal else None,
                    Jsonb(provenance or {}),
                    error,
                ),
            )

    def load(self, key):
        with self.pool.connection() as conn:
            return conn.execute(
                "SELECT * FROM corpus.research_extraction_runs WHERE run_key=%s", (key,)
            ).fetchone()

    def pending_documents(self, policy, limit):
        with self.pool.connection() as conn:
            rows = conn.execute(
                """SELECT d.document_id::text FROM corpus.research_documents d
                WHERE (SELECT count(DISTINCT r.page_number)
                    FROM corpus.research_extraction_runs r WHERE r.document_id=d.document_id
                    AND r.artifact_hash=d.artifact_hash AND r.status='succeeded'
                    AND r.provenance->'policy'=%s) < d.page_count
                OR EXISTS (SELECT 1 FROM corpus.research_extraction_runs r
                    WHERE r.document_id=d.document_id AND r.artifact_hash=d.artifact_hash
                    AND r.status IN ('running','failed') AND r.provenance->'policy'=%s)
                ORDER BY d.synced_at,d.document_id LIMIT %s""",
                (
                    Jsonb(policy.model_dump(mode="json")),
                    Jsonb(policy.model_dump(mode="json")),
                    limit,
                ),
            ).fetchall()
        return [row["document_id"] for row in rows]

    def save(self, key, document, page, proposal, probabilities, policy, provenance):
        with self.pool.connection() as conn, conn.transaction():
            current = conn.execute(
                """SELECT artifact_hash FROM corpus.research_documents
                WHERE document_id=%s FOR UPDATE""",
                (document.document_id,),
            ).fetchone()
            if current["artifact_hash"] != document.artifact_hash:
                raise ValueError("Artifact changed during extraction")
            if policy.approved:
                self._reviewed_entities(conn, policy.entities)
            ids = {}
            for entity in proposal.entities:
                reviewed = conn.execute(
                    """SELECT DISTINCT e.entity_id
                    FROM corpus.research_entities e JOIN corpus.research_aliases a USING(entity_id)
                    WHERE a.reviewed AND a.normalized_alias=%s AND e.kind=%s LIMIT 2""",
                    (normalize(entity.label), entity.kind.value),
                ).fetchall()
                identifier = (
                    str(reviewed[0]["entity_id"])
                    if len(reviewed) == 1
                    else graph_id(
                        f"entity:{document.document_id}:{entity.kind}:{normalize(entity.label)}"
                    )
                )
                ids[entity.ref] = identifier
                conn.execute(
                    """INSERT INTO corpus.research_entities
                    (entity_id,label,kind,normalized_label) VALUES (%s,%s,%s,%s)
                    ON CONFLICT(entity_id) DO NOTHING""",
                    (identifier, entity.label, entity.kind.value, normalize(entity.label)),
                )
                for alias in {entity.label, entity.surface, *entity.aliases}:
                    conn.execute(
                        """INSERT INTO corpus.research_aliases
                        (entity_id,alias,normalized_alias) VALUES (%s,%s,%s)
                        ON CONFLICT DO NOTHING""",
                        (identifier, alias, normalize(alias)),
                    )
                conn.execute(
                    """INSERT INTO corpus.research_mentions
                    (mention_id,entity_id,document_id,page_number,artifact_hash,surface,quote)
                    VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                    (
                        graph_id(f"mention:{key}:{entity.ref}"),
                        identifier,
                        document.document_id,
                        page,
                        document.artifact_hash,
                        entity.surface,
                        entity.quote,
                    ),
                )
            for index, relation in enumerate(proposal.relationships):
                probability = probabilities[index]
                status = "pending"
                if probability <= policy.reject_probability:
                    status = "rejected"
                elif policy.approved and probability >= policy.accept_probability:
                    status = "accepted"
                if ids[relation.subject] == ids[relation.object]:
                    continue
                conn.execute(
                    """INSERT INTO corpus.research_assertions
                    (assertion_id,subject_id,object_id,predicate,document_id,page_number,
                    artifact_hash,quote,temporal_context,status,probability,provenance)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT(assertion_id) DO UPDATE SET status=EXCLUDED.status,
                    probability=EXCLUDED.probability,provenance=EXCLUDED.provenance""",
                    (
                        graph_id(f"relation:{key}:{index}"),
                        ids[relation.subject],
                        ids[relation.object],
                        relation.predicate.value,
                        document.document_id,
                        page,
                        document.artifact_hash,
                        relation.quote,
                        relation.temporal_context,
                        status,
                        probability,
                        Jsonb(provenance),
                    ),
                )
            conn.execute(
                """UPDATE corpus.research_extraction_runs
                SET status='succeeded',provenance=provenance || %s,error=NULL,updated_at=now()
                WHERE run_key=%s""",
                (Jsonb(provenance), key),
            )

    @staticmethod
    def _reviewed_entities(conn, entities):
        for entity in entities:
            identifier = graph_id(f"reviewed:{entity.kind}:{normalize(entity.label)}")
            conn.execute(
                """INSERT INTO corpus.research_entities
                (entity_id,label,kind,normalized_label) VALUES (%s,%s,%s,%s)
                ON CONFLICT DO NOTHING""",
                (identifier, entity.label, entity.kind.value, normalize(entity.label)),
            )
            for alias in {entity.label, *entity.aliases}:
                conn.execute(
                    """INSERT INTO corpus.research_aliases
                    (entity_id,alias,normalized_alias,reviewed) VALUES (%s,%s,%s,true)
                    ON CONFLICT(entity_id,normalized_alias) DO UPDATE SET reviewed=true""",
                    (identifier, alias, normalize(alias)),
                )
