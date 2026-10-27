"""Bounded global graph projections over current published evidence."""

from uuid import UUID

from brh_core.db.research_graph import evidence_model


class ResearchAtlasRepository:
    def __init__(self, pool):
        self.pool = pool

    def _edges(self, query):
        clauses = ["d.publication_id IS NOT NULL", "x.artifact_hash=d.artifact_hash"]
        params = []
        for field, expression in (("family", "d.family=%s"), ("year", "%s=ANY(d.period_years)")):
            if value := getattr(query, field):
                clauses.append(expression)
                params.append(value)
        if query.view == "mentions":
            source = (
                "corpus.research_mentions x "
                "JOIN corpus.research_visible_entities e USING(entity_id)"
            )
            if query.kind:
                clauses.append("e.kind=%s")
                params.append(query.kind)
            select = """'mention:'||x.document_id||':'||x.entity_id id,
                'document:'||x.document_id source,'entity:'||x.entity_id target,
                'mention' type,'mentionne' label,count(*) weight"""
            group = "GROUP BY x.document_id,x.entity_id"
        else:
            source = """corpus.research_assertions x
                JOIN corpus.research_visible_entities e ON e.entity_id=x.subject_id
                JOIN corpus.research_visible_entities o ON o.entity_id=x.object_id"""
            clauses.append("x.status='accepted'")
            if query.kind:
                clauses.append("(e.kind=%s OR o.kind=%s)")
                params.extend([query.kind, query.kind])
            if query.relationship:
                clauses.append("x.predicate=%s")
                params.append(query.relationship)
            select = """'assertion:'||x.assertion_id id,'entity:'||x.subject_id source,
                'entity:'||x.object_id target,'assertion' type,x.predicate label,1 weight"""
            group = ""
        sql = f"""SELECT {select} FROM {source}
            JOIN corpus.research_documents d ON d.document_id=x.document_id
            WHERE {" AND ".join(clauses)} {group}"""
        return sql, params

    def overview(self, query):
        edges, params = self._edges(query)
        # All counts and selected rows share one repeatable-read snapshot.
        with self.pool.connection() as conn, conn.transaction():
            conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            conn.execute("SET LOCAL statement_timeout='5s'")
            cte = f"""WITH RECURSIVE edges AS ({edges}),
                walk(id,depth) AS (
                    SELECT %s::text,0 UNION
                    SELECT CASE WHEN e.source=w.id THEN e.target ELSE e.source END,w.depth+1
                    FROM walk w JOIN edges e ON w.id IN (e.source,e.target) WHERE w.depth<%s
                ), scoped AS (
                    SELECT e.* FROM edges e WHERE %s='' OR EXISTS
                    (SELECT 1 FROM walk w WHERE w.depth<%s AND w.id IN (e.source,e.target))
                ), candidates AS (
                    SELECT source id FROM scoped UNION SELECT target FROM scoped
                    UNION SELECT 'document:'||d.document_id FROM corpus.research_documents d
                    WHERE %s AND d.publication_id IS NOT NULL AND %s=''
                    AND (%s='' OR d.family=%s) AND (%s::int IS NULL OR %s=ANY(d.period_years))
                ), nodes AS (
                    SELECT c.id,e.label,e.kind,NULL::text slug,NULL::text document_id
                    FROM candidates c JOIN corpus.research_visible_entities e
                    ON c.id='entity:'||e.entity_id
                    UNION ALL
                    SELECT c.id,d.title,'document',d.slug,d.document_id::text FROM candidates c
                    JOIN corpus.research_documents d ON c.id='document:'||d.document_id
                ), degrees AS (
                    SELECT id,count(*) degree FROM (
                        SELECT source id FROM scoped UNION ALL SELECT target FROM scoped
                    ) endpoints GROUP BY id
                ), matching AS (
                    SELECT n.*,coalesce(g.degree,0) degree
                    FROM nodes n LEFT JOIN degrees g USING(id)
                    WHERE %s='' OR position(lower(public.unaccent(%s))
                    in lower(public.unaccent(n.label)))>0 OR EXISTS (
                        SELECT 1 FROM corpus.research_aliases a
                        WHERE n.id='entity:'||a.entity_id AND
                        position(lower(public.unaccent(%s)) in a.normalized_alias)>0
                    )
                ), selected AS (
                    SELECT * FROM matching ORDER BY (id=%s) DESC,degree DESC,id LIMIT %s
                ), selected_edges AS (
                    SELECT * FROM scoped WHERE source IN (SELECT id FROM selected)
                    AND target IN (SELECT id FROM selected) ORDER BY id LIMIT %s
                ) """
            values = [
                *params,
                query.focus,
                query.hops,
                query.focus,
                query.hops,
                query.orphans and query.view == "mentions" and not query.kind,
                query.focus,
                query.family,
                query.family,
                query.year,
                query.year,
                query.q,
                query.q,
                query.q,
                query.focus,
                query.node_limit,
                query.edge_limit,
            ]
            row = conn.execute(
                cte
                + """SELECT
                coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY degree DESC,id)
                    FROM selected n),'[]') nodes,
                coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY id)
                    FROM selected_edges e),'[]') edges,
                (SELECT count(*) FROM matching) matching_nodes,
                (SELECT count(*) FROM scoped e WHERE source IN (SELECT id FROM matching)
                 AND target IN (SELECT id FROM matching)) matching_edges""",
                values,
            ).fetchone()
        return {
            **row,
            "view": query.view,
            "displayed_nodes": len(row["nodes"]),
            "displayed_edges": len(row["edges"]),
            "truncated": len(row["nodes"]) < row["matching_nodes"]
            or len(row["edges"]) < row["matching_edges"],
        }

    def evidence(self, edge_id, *, page=1, page_size=20):
        parts = edge_id.split(":")
        if parts[0] == "mention" and len(parts) == 3:
            doc, entity = map(lambda value: str(UUID(value)), parts[1:])
            source = (
                "corpus.research_mentions x "
                "JOIN corpus.research_visible_entities e USING(entity_id)"
            )
            condition, params = "x.document_id=%s AND x.entity_id=%s", [doc, entity]
        elif parts[0] == "assertion" and len(parts) == 2:
            identifier = str(UUID(parts[1]))
            source = """corpus.research_assertions x
                JOIN corpus.research_visible_entities e ON e.entity_id=x.subject_id
                JOIN corpus.research_visible_entities o ON o.entity_id=x.object_id"""
            condition, params = "x.assertion_id=%s AND x.status='accepted'", [identifier]
        else:
            raise ValueError("Invalid edge identifier")
        with self.pool.connection() as conn, conn.transaction():
            conn.execute("SET LOCAL statement_timeout='5s'")
            rows = conn.execute(
                f"""SELECT x.document_id,x.page_number,x.quote,x.artifact_hash,
                d.slug,d.title,d.source_urls,count(*) OVER() total,
                {"x.temporal_context" if parts[0] == "assertion" else "NULL::text"} temporal_context
                FROM {source} JOIN corpus.research_documents d ON d.document_id=x.document_id
                WHERE {condition} AND x.artifact_hash=d.artifact_hash
                AND d.publication_id IS NOT NULL ORDER BY d.title,x.page_number,x.quote
                LIMIT %s OFFSET %s""",
                [*params, page_size, (page - 1) * page_size],
            ).fetchall()
        return {
            "items": [
                {
                    **evidence_model(r).model_dump(mode="json"),
                    "temporal_context": r["temporal_context"],
                }
                for r in rows
            ],
            "total": rows[0]["total"] if rows else 0,
            "page": page,
            "page_size": page_size,
        }
