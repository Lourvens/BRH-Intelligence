"""Retain evidence for invalid trial proposals while excluding public entities."""

from psycopg.types.json import Jsonb

from brh_core.corpus.entity_types import is_temporal_label


def quarantine_temporal_entities(pool):
    with pool.connection() as conn, conn.transaction():
        rows = conn.execute("SELECT entity_id,label,kind FROM corpus.research_entities").fetchall()
        rejected = [row for row in rows if is_temporal_label(row["label"])]
        for row in rejected:
            conn.execute(
                """INSERT INTO corpus.research_entity_rejections (entity_id,reason,details)
                VALUES (%s,'standalone_temporal_label',%s) ON CONFLICT DO NOTHING""",
                (
                    row["entity_id"],
                    Jsonb(
                        {
                            "rule": "temporal-label-v1",
                            "label": row["label"],
                            "proposed_kind": row["kind"],
                        }
                    ),
                ),
            )
        if rejected:
            ids = [row["entity_id"] for row in rejected]
            conn.execute(
                """UPDATE corpus.research_assertions SET status='rejected',
                provenance=provenance || '{"quality_rule":"temporal-label-v1"}'::jsonb
                WHERE subject_id=ANY(%s::uuid[]) OR object_id=ANY(%s::uuid[])""",
                (ids, ids),
            )
        return {"quarantined": len(rejected)}
