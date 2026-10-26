"""Persist the rebuildable OCR reading projection transactionally."""

from psycopg.types.json import Jsonb


class ResearchImportRepository:
    def __init__(self, pool):
        self.pool = pool

    def lock(self, sha256):
        from brh_core.db.index_manifest import PostgresIndexLedger

        return PostgresIndexLedger(self.pool).lock("publication:" + sha256)

    def source(self, sha256: str) -> dict:
        with self.pool.connection() as conn:
            document = conn.execute(
                "SELECT document_id, slug, title, source_url FROM corpus.documents WHERE sha256=%s",
                (sha256,),
            ).fetchone()
            aliases = conn.execute(
                "SELECT url, title, wp_date FROM corpus.crawl_urls WHERE sha256=%s ORDER BY url",
                (sha256,),
            ).fetchall()
        return {"document": document, "aliases": aliases}

    def save(self, document: dict, pages: dict[int, str], publication: dict) -> bool:
        with self.pool.connection() as conn, conn.transaction():
            existing = conn.execute(
                "SELECT artifact_hash, slug,publication_id FROM corpus.research_documents "
                "WHERE document_id=%s "
                "FOR UPDATE",
                (document["document_id"],),
            ).fetchone()
            changed = not existing or existing["artifact_hash"] != document["artifact_hash"]
            promoted = not existing or existing["publication_id"] != publication["publication_id"]
            if existing:
                document["slug"] = existing["slug"]
            conn.execute(
                """INSERT INTO corpus.research_documents
                (document_id,sha256,artifact_hash,slug,title,family,period_label,period_years,
                 uploaded_at,source_urls,page_count,figure_count,metadata)
                VALUES (%(document_id)s,%(sha256)s,%(artifact_hash)s,%(slug)s,%(title)s,%(family)s,
                        %(period_label)s,%(period_years)s,%(uploaded_at)s,%(source_urls)s,
                        %(page_count)s,%(figure_count)s,%(metadata)s)
                ON CONFLICT(document_id) DO UPDATE SET
                    artifact_hash=EXCLUDED.artifact_hash,
                    title=coalesce(research_documents.editorial->>'title',EXCLUDED.title),
                    family=coalesce(research_documents.editorial->>'family',EXCLUDED.family),
                    period_label=EXCLUDED.period_label,period_years=EXCLUDED.period_years,
                    uploaded_at=EXCLUDED.uploaded_at,source_urls=EXCLUDED.source_urls,
                    page_count=EXCLUDED.page_count,figure_count=EXCLUDED.figure_count,
                    metadata=EXCLUDED.metadata,synced_at=now()""",
                {**document, "metadata": Jsonb(document["metadata"])},
            )
            conn.execute(
                """INSERT INTO corpus.research_publications
                (document_id,publication_id,artifact_hash,storage_backend,manifest)
                VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                (
                    document["document_id"],
                    publication["publication_id"],
                    document["artifact_hash"],
                    publication["storage_backend"],
                    Jsonb(publication["manifest"]),
                ),
            )
            if changed:
                # Cascades invalidate the previous artifact's mentions/assertions.
                conn.execute(
                    "DELETE FROM corpus.research_pages WHERE document_id=%s",
                    (document["document_id"],),
                )
                with conn.cursor() as cursor:
                    cursor.executemany(
                        "INSERT INTO corpus.research_pages VALUES (%s,%s,%s)",
                        [(document["document_id"], number, text) for number, text in pages.items()],
                    )
            conn.execute(
                "UPDATE corpus.research_documents SET publication_id=%s WHERE document_id=%s",
                (publication["publication_id"], document["document_id"]),
            )
            return promoted or changed
