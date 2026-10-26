"""Bounded SQL reads for Markdown research documents."""

import re

from brh_core.corpus.models import CorpusQuery, ResearchDocument, SearchMode

DOCUMENT_COLUMNS = """d.document_id::text,d.sha256,d.artifact_hash,d.slug,d.title,d.family,
    d.period_label,d.period_years,d.publication_date,d.date_basis,d.uploaded_at,
    d.source_urls,d.page_count,d.figure_count,d.synced_at,d.publication_id,
    (SELECT p.published_at FROM corpus.research_publications p
     WHERE p.document_id=d.document_id AND p.publication_id=d.publication_id) published_at"""


def where_documents(query: CorpusQuery) -> tuple[str, list]:
    clauses, parameters = ["true"], []
    if query.family:
        clauses.append("d.family=%s")
        parameters.append(query.family)
    if query.year:
        clauses.append("(%s=ANY(d.period_years) OR extract(year FROM d.publication_date)=%s)")
        parameters.extend([query.year, query.year])
    if query.entity_id:
        clauses.append("""EXISTS (SELECT 1 FROM corpus.research_mentions m
            JOIN corpus.research_visible_entities e USING(entity_id)
            WHERE m.document_id=d.document_id AND m.artifact_hash=d.artifact_hash
            AND m.entity_id=%s::uuid)""")
        parameters.append(query.entity_id)
    if query.document_id:
        clauses.append("d.document_id=%s::uuid")
        parameters.append(query.document_id)
    if query.q.strip():
        if query.mode == SearchMode.text:
            clauses.append("""EXISTS (SELECT 1 FROM corpus.research_pages p
                WHERE p.document_id=d.document_id AND p.search_text @@
                websearch_to_tsquery('corpus.research_french',%s))""")
            parameters.append(query.q)
        else:
            escaped = query.q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            if re.search(r"\d", query.q):
                clauses.append("lower(public.unaccent(d.title)) LIKE lower(public.unaccent(%s))")
                parameters.append(f"%{escaped}%")
            else:
                clauses.append("""(d.title_search @@ websearch_to_tsquery(
                    'corpus.research_french',%s) OR lower(public.unaccent(d.title))
                    LIKE lower(public.unaccent(%s)))""")
                parameters.extend([query.q, f"%{escaped}%"])
    return " AND ".join(clauses), parameters


def document_model(row: dict) -> ResearchDocument:
    return ResearchDocument.model_validate(row)


class ResearchQueryRepository:
    def __init__(self, pool):
        self.pool = pool

    def document(self, identifier: str) -> ResearchDocument | None:
        with self.pool.connection() as conn:
            row = conn.execute(
                f"SELECT {DOCUMENT_COLUMNS} FROM corpus.research_documents d "
                "WHERE d.slug=%s OR d.document_id::text=%s",
                (identifier, identifier),
            ).fetchone()
        return document_model(row) if row else None

    def page_snapshot(self, identifier: str, number: int):
        # One statement has one MVCC snapshot even while a publisher promotes.
        with self.pool.connection() as conn:
            row = conn.execute(
                f"""SELECT {DOCUMENT_COLUMNS},p.markdown FROM corpus.research_documents d
                LEFT JOIN corpus.research_pages p
                  ON p.document_id=d.document_id AND p.page_number=%s
                WHERE d.slug=%s OR d.document_id::text=%s""",
                (number, identifier, identifier),
            ).fetchone()
        if row is None:
            raise FileNotFoundError("Unknown document")
        markdown = row.pop("markdown")
        document = document_model(row)
        if number < 1 or number > document.page_count:
            raise IndexError("Page outside document")
        if markdown is None:
            raise RuntimeError("Published page missing")
        return document, markdown

    def publication(self, identifier, publication_id=None):
        with self.pool.connection() as conn:
            return conn.execute(
                """SELECT p.*,d.sha256,d.slug,d.title FROM corpus.research_documents d
                JOIN corpus.research_publications p ON p.document_id=d.document_id
                  AND p.publication_id=coalesce(%s,d.publication_id)
                WHERE d.slug=%s OR d.document_id::text=%s""",
                (publication_id, identifier, identifier),
            ).fetchone()

    def publication_health(self):
        with self.pool.connection() as conn:
            counts = conn.execute("""SELECT count(*) documents,
                count(*) FILTER (WHERE publication_id IS NOT NULL) published_documents,
                max(synced_at) last_synced_at FROM corpus.research_documents""").fetchone()
            latest = conn.execute("""SELECT p.*,d.sha256 FROM corpus.research_publications p
                JOIN corpus.research_documents d ON d.document_id=p.document_id
                  AND d.publication_id=p.publication_id
                ORDER BY p.published_at DESC LIMIT 1""").fetchone()
        return counts, latest

    def documents(self, query: CorpusQuery) -> dict:
        where, parameters = where_documents(query)
        order = {
            "title": "lower(d.title),d.document_id",
            "recent": "d.synced_at DESC,d.document_id",
            "period": "d.period_years DESC NULLS LAST,d.document_id",
        }[query.sort]
        with self.pool.connection() as conn, conn.transaction():
            conn.execute("SET LOCAL statement_timeout='5s'")
            total = conn.execute(
                f"SELECT count(*) AS total FROM corpus.research_documents d WHERE {where}",
                parameters,
            ).fetchone()["total"]
            rows = conn.execute(
                f"""SELECT {DOCUMENT_COLUMNS},
                (SELECT count(DISTINCT entity_id) FROM corpus.research_mentions m
                 JOIN corpus.research_visible_entities e USING(entity_id)
                 WHERE m.document_id=d.document_id
                 AND m.artifact_hash=d.artifact_hash) entity_count,
                (SELECT count(*) FROM corpus.research_assertions a
                 WHERE a.document_id=d.document_id AND a.artifact_hash=d.artifact_hash
                 AND a.status='accepted') relationship_count
                FROM corpus.research_documents d WHERE {where}
                ORDER BY {order} LIMIT %s OFFSET %s""",
                [*parameters, query.page_size, (query.page - 1) * query.page_size],
            ).fetchall()
            if query.mode == SearchMode.text and query.q.strip():
                for row in rows:
                    match = conn.execute(
                        """SELECT page_number, markdown FROM corpus.research_pages
                        WHERE document_id=%s AND search_text @@
                        websearch_to_tsquery('corpus.research_french',%s)
                        ORDER BY ts_rank(search_text,websearch_to_tsquery(
                            'corpus.research_french',%s)) DESC,page_number LIMIT 1""",
                        (row["document_id"], query.q, query.q),
                    ).fetchone()
                    if match:
                        row.update(match_page=match["page_number"], snippet=match["markdown"][:400])
        return {
            "items": [document_model(row) for row in rows],
            "total": total,
            "page": query.page,
            "page_size": query.page_size,
        }

    def facets(self, query: CorpusQuery) -> dict:
        if query.mode in {SearchMode.entities, SearchMode.semantic}:
            query = query.model_copy(update={"q": ""})
        where, parameters = where_documents(query.model_copy(update={"family": ""}))
        years_where, years_parameters = where_documents(query.model_copy(update={"year": None}))
        with self.pool.connection() as conn:
            families = conn.execute(
                f"""SELECT family,count(*) count FROM corpus.research_documents d
                WHERE {where} GROUP BY family ORDER BY family""",
                parameters,
            ).fetchall()
            years = conn.execute(
                f"""SELECT DISTINCT unnest(period_years) AS period_year
                FROM corpus.research_documents d
                WHERE {years_where} ORDER BY period_year DESC""",
                years_parameters,
            ).fetchall()
        return {"families": families, "years": [row["period_year"] for row in years]}

    def eligible_document_ids(self, query: CorpusQuery) -> list[str]:
        where, parameters = where_documents(query.model_copy(update={"q": ""}))
        with self.pool.connection() as conn:
            rows = conn.execute(
                f"""SELECT d.document_id::text FROM corpus.research_documents d
                WHERE {where} ORDER BY d.document_id LIMIT 1001""",
                parameters,
            ).fetchall()
        if len(rows) > 1000:
            raise ValueError("Narrow semantic filters to at most 1000 eligible documents")
        return [row["document_id"] for row in rows]

    def pages(self, identifier: str) -> list[dict]:
        with self.pool.connection() as conn:
            return conn.execute(
                "SELECT page_number,markdown FROM corpus.research_pages WHERE document_id=%s "
                "ORDER BY page_number",
                (identifier,),
            ).fetchall()

    def stats(self) -> dict:
        with self.pool.connection() as conn:
            row = conn.execute("""SELECT
                (SELECT count(*) FROM corpus.crawl_urls) discovered_urls,
                (SELECT count(*) FROM corpus.research_documents) readable_documents,
                (SELECT count(*) FROM corpus.research_pages) readable_pages,
                (SELECT count(*) FROM corpus.research_visible_entities e WHERE EXISTS (
                    SELECT 1 FROM corpus.research_mentions m JOIN corpus.research_documents d
                    USING(document_id) WHERE m.entity_id=e.entity_id
                    AND m.artifact_hash=d.artifact_hash)) entities,
                (SELECT count(DISTINCT a.document_id) FROM corpus.research_assertions a
                    JOIN corpus.research_documents d USING(document_id)
                    WHERE a.artifact_hash=d.artifact_hash AND a.status='accepted') graph_documents,
                (SELECT count(*) FROM corpus.research_assertions a
                    JOIN corpus.research_documents d USING(document_id)
                    WHERE a.artifact_hash=d.artifact_hash AND a.status='accepted') relationships,
                (SELECT count(*) FROM corpus.research_documents d WHERE
                    (SELECT count(DISTINCT r.page_number) FROM corpus.research_extraction_runs r
                        WHERE r.document_id=d.document_id AND r.artifact_hash=d.artifact_hash
                        AND r.status='succeeded')=d.page_count
                    AND NOT EXISTS (SELECT 1 FROM corpus.research_extraction_runs r
                        WHERE r.document_id=d.document_id AND r.artifact_hash=d.artifact_hash
                        AND r.status IN ('running','failed'))) processed_documents,
                (SELECT max(synced_at) FROM corpus.research_documents) as_of""").fetchone()
        return dict(row)
