"""Evidence-qualified entity lookup and bounded graph traversal in Postgres."""

from brh_core.corpus.artifacts import official_pdf
from brh_core.corpus.metadata import normalize
from brh_core.corpus.models import Entity, Evidence, GraphEdge, GraphResult

ENTITY_SELECT = """e.entity_id::text,e.label,e.kind,
    array(SELECT a.alias FROM corpus.research_aliases a WHERE a.entity_id=e.entity_id) aliases,
    count(DISTINCT m.document_id) document_count,count(DISTINCT m.mention_id) mention_count"""


def evidence_model(row: dict) -> Evidence:
    return Evidence(
        document_id=str(row["document_id"]),
        slug=row["slug"],
        title=row["title"],
        page_number=row["page_number"],
        quote=row["quote"],
        artifact_hash=row["artifact_hash"],
        pdf_url=official_pdf(next(iter(row["source_urls"]), None), row["page_number"]),
    )


class ResearchGraphRepository:
    def __init__(self, pool):
        self.pool = pool

    def entities(
        self,
        query="",
        *,
        kind="",
        limit=25,
        entity_ids=None,
        document_id=None,
        family="",
        year=None,
        offset=0,
        with_total=False,
    ) -> list[Entity]:
        clauses, params = ["m.artifact_hash=d.artifact_hash", "d.publication_id IS NOT NULL"], []
        if entity_ids is not None:
            clauses.append("e.entity_id=ANY(%s::uuid[])")
            params.append(list(entity_ids))
        if query:
            clauses.append("""(position(%s in e.normalized_label)>0 OR EXISTS (
                SELECT 1 FROM corpus.research_aliases a WHERE a.entity_id=e.entity_id
                AND position(%s in a.normalized_alias)>0))""")
            params.extend([normalize(query), normalize(query)])
        if kind:
            clauses.append("e.kind=%s")
            params.append(kind)
        if document_id:
            clauses.append("d.document_id=%s::uuid")
            params.append(document_id)
        if family:
            clauses.append("d.family=%s")
            params.append(family)
        if year:
            clauses.append("%s=ANY(d.period_years)")
            params.append(year)
        with self.pool.connection() as conn, conn.transaction():
            conn.execute("SET LOCAL statement_timeout='5s'")
            rows = conn.execute(
                f"""SELECT {ENTITY_SELECT},count(*) OVER() total
                FROM corpus.research_visible_entities e
                JOIN corpus.research_mentions m USING(entity_id)
                JOIN corpus.research_documents d USING(document_id)
                WHERE {" AND ".join(clauses)} GROUP BY e.entity_id,e.label,e.kind
                ORDER BY count(DISTINCT m.document_id) DESC,e.label,e.entity_id
                LIMIT %s OFFSET %s""",
                [*params, min(limit, 100), offset],
            ).fetchall()
            total = (
                conn.execute(
                    f"""SELECT count(DISTINCT e.entity_id) total
                FROM corpus.research_visible_entities e
                JOIN corpus.research_mentions m USING(entity_id)
                JOIN corpus.research_documents d USING(document_id)
                WHERE {" AND ".join(clauses)}""",
                    params,
                ).fetchone()["total"]
                if with_total
                else 0
            )
        items = [
            Entity.model_validate({k: v for k, v in row.items() if k != "total"}) for row in rows
        ]
        return (items, total) if with_total else items

    def mentions(self, entity_id: str, *, limit=100) -> list[Evidence]:
        with self.pool.connection() as conn:
            rows = conn.execute(
                """SELECT m.document_id,m.page_number,m.quote,m.artifact_hash,
                d.slug,d.title,d.source_urls FROM corpus.research_mentions m
                JOIN corpus.research_visible_entities e USING(entity_id)
                JOIN corpus.research_documents d USING(document_id)
                WHERE m.entity_id=%s AND m.artifact_hash=d.artifact_hash
                ORDER BY d.title,m.page_number,m.mention_id LIMIT %s""",
                (entity_id, min(limit, 100)),
            ).fetchall()
        return [evidence_model(row) for row in rows]

    def neighborhood(
        self, entity_id: str, *, hops=1, family="", year=None, kind="", relationship=""
    ) -> GraphResult:
        clauses, params = (
            [
                "a.status='accepted'",
                "a.artifact_hash=d.artifact_hash",
                "EXISTS (SELECT 1 FROM corpus.research_visible_entities e "
                "WHERE e.entity_id=a.subject_id)",
                "EXISTS (SELECT 1 FROM corpus.research_visible_entities e "
                "WHERE e.entity_id=a.object_id)",
            ],
            [],
        )
        if family:
            clauses.append("d.family=%s")
            params.append(family)
        if year:
            clauses.append("%s=ANY(d.period_years)")
            params.append(year)
        if relationship:
            clauses.append("a.predicate=%s")
            params.append(relationship)
        if kind:
            clauses.append("""EXISTS (SELECT 1 FROM corpus.research_visible_entities e
                WHERE e.entity_id IN (a.subject_id,a.object_id) AND e.kind=%s)""")
            params.append(kind)
        with self.pool.connection() as conn, conn.transaction():
            conn.execute("SET LOCAL statement_timeout='5s'")
            rows = conn.execute(
                f"""WITH RECURSIVE eligible AS (
                SELECT a.*,d.slug,d.title,d.source_urls FROM corpus.research_assertions a
                JOIN corpus.research_documents d USING(document_id)
                WHERE {" AND ".join(clauses)}
            ), walk(entity_id,depth) AS (
                SELECT %s::uuid,0 UNION
                SELECT CASE WHEN a.subject_id=w.entity_id THEN a.object_id ELSE a.subject_id END,
                    w.depth+1 FROM walk w JOIN eligible a
                    ON w.entity_id IN (a.subject_id,a.object_id) WHERE w.depth<%s
            ) SELECT a.*,min(w.depth) distance FROM eligible a JOIN walk w
                ON w.entity_id IN (a.subject_id,a.object_id) AND w.depth<%s
                GROUP BY a.assertion_id,a.subject_id,a.object_id,a.predicate,a.document_id,
                    a.page_number,a.artifact_hash,a.quote,a.temporal_context,a.status,
                    a.probability,a.provenance,a.slug,a.title,a.source_urls
                ORDER BY distance,a.assertion_id LIMIT 201""",
                [*params, entity_id, hops, hops],
            ).fetchall()
        node_ids, edges = {entity_id}, []
        truncated = len(rows) > 200
        for row in rows[:200]:
            endpoints = {str(row["subject_id"]), str(row["object_id"])}
            if len(node_ids | endpoints) > 100 or not endpoints & node_ids:
                truncated = True
                continue
            node_ids |= endpoints
            edges.append(
                GraphEdge(
                    assertion_id=str(row["assertion_id"]),
                    subject_id=str(row["subject_id"]),
                    object_id=str(row["object_id"]),
                    predicate=row["predicate"],
                    temporal_context=row["temporal_context"],
                    evidence=evidence_model(row),
                )
            )
        return GraphResult(
            nodes=tuple(self.entities(entity_ids=node_ids, limit=100)),
            edges=tuple(edges),
            truncated=truncated,
            hops=hops,
        )
