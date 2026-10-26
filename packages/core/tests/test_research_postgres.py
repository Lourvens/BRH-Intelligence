"""Isolated SQL acceptance: never reset the running embedding corpus."""

import os
from uuid import uuid4

import psycopg
import pytest
from brh_core.config import Settings
from brh_core.corpus.extraction import extract_document
from brh_core.corpus.extraction_models import ExtractionPolicy
from brh_core.corpus.models import CorpusQuery
from brh_core.corpus.service import ResearchCorpus
from brh_core.corpus.storage import publication_storage
from brh_core.corpus.sync import sync_artifacts
from brh_core.db.migrate import apply_migrations
from brh_core.db.pool import open_pool
from brh_core.db.research_extraction import ResearchExtractionRepository, graph_id
from brh_core.db.research_graph import ResearchGraphRepository
from brh_core.db.research_import import ResearchImportRepository
from brh_core.db.research_query import ResearchQueryRepository
from psycopg import sql
from test_research_corpus import artifact_fixture, proposal_fixture


@pytest.fixture
def research_db(tmp_path):
    if os.getenv("BRH_TEST_POSTGRES") != "1":
        pytest.skip("Postgres acceptance is opt-in")
    base = Settings()
    name = "brh_research_test_" + uuid4().hex[:10]
    with psycopg.connect(base.postgres_dsn, autocommit=True) as conn:
        conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    settings = base.model_copy(
        update={
            "postgres_db": name,
            "ocr_dir": tmp_path / "ocr",
            "publication_dir": tmp_path / "published",
        }
    )
    pool = None
    try:
        assert "0005_research_graph" in apply_migrations(settings)
        assert apply_migrations(settings) == []
        pool = open_pool(settings)
        pool.open(wait=True)
        yield settings, pool
    finally:
        if pool:
            pool.close()
        with psycopg.connect(base.postgres_dsn, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name)))


class FakeClient:
    def __init__(self):
        self.extractions = 0
        self.judgments = 0
        self.fail = False

    def extract(self, text):
        self.extractions += 1
        return proposal_fixture(), {"model": "fixture"}

    def judge(self, proposal, text):
        self.judgments += 1
        if self.fail:
            self.fail = False
            raise RuntimeError("temporary validation failure")
        return [0.99], {"model": "fixture-judge"}


@pytest.mark.integration
def test_markdown_graph_roundtrip_and_stale_evidence(research_db):
    settings, pool = research_db
    artifact = artifact_fixture(settings.ocr_dir)
    importer = ResearchImportRepository(pool)
    assert sync_artifacts(settings.ocr_dir, importer, publication_storage(settings))["changed"] == 1
    assert sync_artifacts(settings.ocr_dir, importer, publication_storage(settings))["changed"] == 0
    queries = ResearchQueryRepository(pool)
    graph = ResearchGraphRepository(pool)
    service = ResearchCorpus(settings, queries, graph)
    listing = queries.documents(CorpusQuery(q="inflation"))
    document = listing["items"][0]
    assert listing["total"] == 1
    assert document.publication_date is None
    assert queries.documents(CorpusQuery(q="prix", mode="text"))["total"] == 1
    assert service.page(document.slug, 1).markdown.startswith("# Inflation")
    assert queries.facets(CorpusQuery())["families"][0]["family"] == "inflation"
    client = FakeClient()
    client.fail = True
    repository = ResearchExtractionRepository(pool)
    policy = ExtractionPolicy(
        model="fixture",
        accept_probability=0.95,
        reject_probability=0.2,
        approved_by="offline test",
        evaluation_reference="fixture",
    )
    with pytest.raises(RuntimeError):
        extract_document(
            document,
            queries.pages(document.document_id),
            client=client,
            repository=repository,
            policy=policy,
        )
    extract_document(
        document,
        queries.pages(document.document_id),
        client=client,
        repository=repository,
        policy=policy,
    )
    assert client.extractions == 1  # Reuse the checkpoint after Jev failure.
    assert (
        extract_document(
            document,
            queries.pages(document.document_id),
            client=client,
            repository=repository,
            policy=policy,
        )["reused"]
        == 1
    )
    entities = graph.entities("BRH")
    assert len(entities) == 1
    neighborhood = service.neighborhood(entities[0].entity_id, hops=2)
    assert len(neighborhood.edges) == 1
    assert len(neighborhood.nodes) == 2
    assert neighborhood.edges[0].evidence.pdf_url is None
    assert len(service.graph_passages(entities[0].entity_id)["items"]) >= 1
    assert queries.stats()["relationships"] == 1
    artifact.markdown.write_text("<!-- page 1 -->\nNouveau texte")
    assert service.page(document.slug, 1).markdown.startswith("# Inflation")
    assert service.neighborhood(entities[0].entity_id).edges
    sync_artifacts(settings.ocr_dir, importer, publication_storage(settings))
    assert not graph.entities("BRH")
    assert queries.stats()["relationships"] == 0


@pytest.mark.integration
def test_published_read_without_ocr_and_previous_assets_survive(research_db):
    import shutil

    settings, pool = research_db
    artifact = artifact_fixture(settings.ocr_dir, "<!-- page 1 -->\nAncien ![](assets/chart.png)")
    assets = artifact.markdown.parent / "assets"
    assets.mkdir()
    (assets / "chart.png").write_bytes(b"original image")
    storage = publication_storage(settings)
    importer = ResearchImportRepository(pool)
    sync_artifacts(settings.ocr_dir, importer, storage)
    queries = ResearchQueryRepository(pool)
    service = ResearchCorpus(settings, queries, ResearchGraphRepository(pool))
    document = queries.documents(CorpusQuery())["items"][0]
    old_version = document.publication_id
    artifact.markdown.write_text("<!-- page 1 -->\nNouveau ![](assets/chart.png)")
    (assets / "chart.png").write_bytes(b"new image")
    sync_artifacts(settings.ocr_dir, importer, storage)
    assert service.asset(document.slug, "chart.png", old_version)[0] == b"original image"
    assert service.asset(document.slug, "chart.png")[0] == b"new image"
    shutil.rmtree(settings.ocr_dir)
    assert service.page(document.slug, 1).markdown.startswith("Nouveau")
    assert service.current_document(document.slug)[0].publication_id != old_version
    assert service.readiness()["ready"]
    shutil.rmtree(settings.publication_dir)
    assert not service.readiness()["ready"]
    assert service.page(document.slug, 1).markdown.startswith("Nouveau")


@pytest.mark.integration
def test_failed_database_promotion_rolls_back_current_pages(research_db):
    settings, pool = research_db
    artifact = artifact_fixture(settings.ocr_dir)
    storage = publication_storage(settings)
    importer = ResearchImportRepository(pool)
    sync_artifacts(settings.ocr_dir, importer, storage)
    queries = ResearchQueryRepository(pool)
    document = queries.documents(CorpusQuery())["items"][0]
    with pool.connection() as conn:
        conn.execute("""CREATE FUNCTION corpus.refuse_publication() RETURNS trigger
            LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated storage promotion failure';
            END $$; CREATE TRIGGER refuse_publication BEFORE INSERT ON
            corpus.research_publications FOR EACH ROW
            EXECUTE FUNCTION corpus.refuse_publication()""")
    artifact.markdown.write_text("<!-- page 1 -->\nUne nouvelle version")
    with pytest.raises(psycopg.Error):
        sync_artifacts(settings.ocr_dir, importer, storage)
    current, text = queries.page_snapshot(document.slug, 1)
    assert current.artifact_hash == document.artifact_hash
    assert text.startswith("# Inflation")


@pytest.mark.integration
def test_readers_never_mix_document_and_page_versions(research_db):
    from concurrent.futures import ThreadPoolExecutor
    from hashlib import sha256

    settings, pool = research_db
    artifact = artifact_fixture(settings.ocr_dir)
    storage = publication_storage(settings)
    importer = ResearchImportRepository(pool)
    sync_artifacts(settings.ocr_dir, importer, storage)
    queries = ResearchQueryRepository(pool)
    document = queries.documents(CorpusQuery())["items"][0]

    def read_pages():
        for _ in range(60):
            current, text = queries.page_snapshot(document.slug, 1)
            raw = "<!-- page 1 -->\n" + text
            # The initial fixture contains an extra blank line.
            options = (raw, "<!-- page 1 -->\n\n" + text)
            assert current.artifact_hash in {sha256(s.encode()).hexdigest() for s in options}

    with ThreadPoolExecutor(max_workers=2) as executor:
        reader = executor.submit(read_pages)
        for index in range(5):
            artifact.markdown.write_text(f"<!-- page 1 -->\nVersion {index}")
            sync_artifacts(settings.ocr_dir, importer, storage)
        reader.result()


@pytest.mark.integration
def test_temporal_trial_entities_are_auditable_but_never_public(research_db):
    from brh_core.db.research_quality import quarantine_temporal_entities

    settings, pool = research_db
    artifact_fixture(settings.ocr_dir)
    sync_artifacts(settings.ocr_dir, ResearchImportRepository(pool), publication_storage(settings))
    document = ResearchQueryRepository(pool).documents(CorpusQuery())["items"][0]
    identifier = graph_id("invalid-date-place")
    with pool.connection() as conn:
        conn.execute(
            """INSERT INTO corpus.research_entities
            (entity_id,label,kind,normalized_label)
            VALUES (%s,'30/09/2010','place','30/09/2010')""",
            (identifier,),
        )
        conn.execute(
            """INSERT INTO corpus.research_mentions
            (mention_id,entity_id,document_id,page_number,artifact_hash,surface,quote)
            VALUES (%s,%s,%s,1,%s,'30/09/2010','Solde au 30/09/2010')""",
            (graph_id("date-mention"), identifier, document.document_id, document.artifact_hash),
        )
    graph = ResearchGraphRepository(pool)
    assert graph.entities("30/09/2010")
    assert quarantine_temporal_entities(pool)["quarantined"] == 1
    assert not graph.entities("30/09/2010")
    assert not graph.mentions(identifier)
    assert ResearchQueryRepository(pool).stats()["entities"] == 0
    assert ResearchQueryRepository(pool).documents(CorpusQuery())["items"][0].entity_count == 0
    with pool.connection() as conn:
        assert conn.execute("SELECT count(*) n FROM corpus.research_entities").fetchone()["n"] == 1
        assert conn.execute("SELECT count(*) n FROM corpus.research_mentions").fetchone()["n"] == 1


@pytest.mark.integration
def test_uncalibrated_policy_cannot_publish_and_completed_batches_advance(research_db):
    settings, pool = research_db
    artifact_fixture(settings.ocr_dir)
    sync_artifacts(settings.ocr_dir, ResearchImportRepository(pool), publication_storage(settings))
    queries = ResearchQueryRepository(pool)
    repository = ResearchExtractionRepository(pool)
    document = queries.documents(CorpusQuery())["items"][0]
    policy = ExtractionPolicy(model="fixture", accept_probability=0.95, reject_probability=0.2)
    assert repository.pending_documents(policy, 1) == [document.document_id]
    extract_document(
        document,
        queries.pages(document.document_id),
        client=FakeClient(),
        repository=repository,
        policy=policy,
    )
    assert repository.pending_documents(policy, 1) == []
    graph = ResearchGraphRepository(pool)
    identifier = graph.entities("BRH")[0].entity_id
    assert not graph.neighborhood(identifier).edges
    with pool.connection() as conn:
        assert (
            conn.execute("SELECT status FROM corpus.research_assertions").fetchone()["status"]
            == "pending"
        )


@pytest.mark.integration
def test_graph_caps_and_cycles_are_bounded(research_db):
    settings, pool = research_db
    artifact_fixture(settings.ocr_dir)
    sync_artifacts(settings.ocr_dir, ResearchImportRepository(pool), publication_storage(settings))
    document = ResearchQueryRepository(pool).documents(CorpusQuery())["items"][0]
    identifiers = [graph_id(f"cap-node:{index}") for index in range(105)]
    with pool.connection() as conn, conn.transaction(), conn.cursor() as cursor:
        cursor.executemany(
            """INSERT INTO corpus.research_entities
                (entity_id,label,kind,normalized_label) VALUES (%s,%s,'institution',%s)""",
            [(key, f"Node {index}", f"node {index}") for index, key in enumerate(identifiers)],
        )
        cursor.executemany(
            """INSERT INTO corpus.research_mentions
                (mention_id,entity_id,document_id,page_number,artifact_hash,surface,quote)
                VALUES (%s,%s,%s,1,%s,'BRH','BRH mesure les prix.')""",
            [
                (graph_id("mention:" + key), key, document.document_id, document.artifact_hash)
                for key in identifiers
            ],
        )
        edges = [(identifiers[0], key) for key in identifiers[1:]]
        edges += [(key, identifiers[0]) for key in identifiers[1:]]
        cursor.executemany(
            """INSERT INTO corpus.research_assertions
                (assertion_id,subject_id,object_id,predicate,document_id,page_number,artifact_hash,
                 quote,status) VALUES
                 (%s,%s,%s,'references',%s,1,%s,'BRH mesure les prix.','accepted')""",
            [
                (
                    graph_id(f"cap-edge:{index}"),
                    a,
                    b,
                    document.document_id,
                    document.artifact_hash,
                )
                for index, (a, b) in enumerate(edges)
            ],
        )
    result = ResearchGraphRepository(pool).neighborhood(identifiers[0], hops=2)
    assert len(result.nodes) <= 100
    assert len(result.edges) <= 200
    assert result.truncated
    assert all(
        edge.subject_id in {node.entity_id for node in result.nodes}
        and edge.object_id in {node.entity_id for node in result.nodes}
        for edge in result.edges
    )
