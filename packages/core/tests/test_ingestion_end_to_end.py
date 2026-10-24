"""Failure-injection tests spanning PDF arrival, indexing, restart and retrieval."""

from pathlib import Path

import pytest
from brh_core.config import Settings
from brh_core.embeddings.hashing import HashingEmbedder
from brh_core.ingestion.metadata import sha256_of_file
from brh_core.ingestion.pipeline import reconcile_corpus, run_ingestion
from brh_core.ingestion.workflow import build_ingestion_workflow
from brh_core.retrieval.service import RetrievalService
from brh_core.vectorstore.memory import InMemoryVectorStore
from test_ingestion_pipeline import FakeRepository, make_pdf
from test_pinecone_integrated import FakeIndex, make_store


def setup_pipeline(tmp_path: Path):
    raw = tmp_path / "raw"
    raw.mkdir()
    settings = Settings(
        _env_file=None,
        raw_dir=raw,
        ocr_dir=tmp_path / "ocr",
        processed_dir=tmp_path / "processed",
        chunk_token_limit=20,
    )
    pdf = raw / "report.pdf"
    make_pdf(pdf, ("\n".join([" ".join(["inflation"] * 8)] * 15),))
    repository = FakeRepository()
    remote = FakeIndex()
    store = make_store(remote)
    return settings, pdf, repository, remote, store


def run(settings, repository, store, **kwargs):
    return run_ingestion(
        settings,
        repository=repository,
        vector_store=store,
        count_tokens=lambda text: len(text.split()),
        tokenizer_id="fixture-exact:v1",
        **kwargs,
    )


def arrive(settings, pdf, text):
    artifact = settings.resolved_ocr_dir / sha256_of_file(pdf)
    artifact.mkdir(parents=True, exist_ok=True)
    (artifact / "document.md").write_text("<!-- page 1 -->\n" + text)


def test_pdf_to_langchain_retrieval_and_later_ocr_replacement(tmp_path):
    settings, pdf, repository, remote, store = setup_pipeline(tmp_path)
    assert not run(settings, repository, store).failures
    old = set(remote.records)
    arrive(settings, pdf, "PaddleOCR inflation canonique")
    assert not run(settings, repository, store).failures
    assert set(remote.records) < old
    service = RetrievalService(settings, vector_store=store, repository=repository)
    result = service.search("inflation")
    assert result.grounded
    assert result.chunks[0].text == "PaddleOCR inflation canonique"
    assert result.citations[0].pdf_url.endswith("#page=1")
    assert service.as_retriever().invoke("inflation")[0].page_content == result.chunks[0].text
    assert run(settings, repository, store).documents_skipped == 1


@pytest.mark.parametrize("failure", ["fail_upsert", "fail_delete"])
def test_restart_recovers_remote_partial_success_and_retains_stale_ids(tmp_path, failure):
    settings, pdf, repository, remote, store = setup_pipeline(tmp_path)
    assert not run(settings, repository, store).failures
    arrive(settings, pdf, "Texte OCR inflation")
    setattr(remote, failure, 1)
    interrupted = run(settings, repository, store)
    assert len(interrupted.failures) == 1
    # New store/coordinator, same durable state and remote server.
    restarted_store = make_store(remote)
    recovered = run(settings, repository, restarted_store)
    assert not recovered.failures
    desired = {chunk.chunk_id for chunks in repository.chunks.values() for chunk in chunks}
    assert set(remote.records) == desired
    assert all(state["status"] == "succeeded" for state in repository.ledger.states.values())


def test_corpus_only_update_does_not_forget_old_remote_ids(tmp_path):
    settings, pdf, repository, remote, store = setup_pipeline(tmp_path)
    run(settings, repository, store)
    arrive(settings, pdf, "Nouveau texte OCR")
    run(settings, repository, None)
    assert not run(settings, repository, store).failures
    assert set(remote.records) == {
        chunk.chunk_id for chunks in repository.chunks.values() for chunk in chunks
    }


def test_historical_success_does_not_skip_content_when_artifact_reverts(tmp_path):
    settings, pdf, repository, remote, store = setup_pipeline(tmp_path)
    arrive(settings, pdf, "Version A")
    run(settings, repository, store)
    arrive(settings, pdf, "Version B")
    run(settings, repository, store)
    arrive(settings, pdf, "Version A")
    assert run(settings, repository, store).documents_processed == 1
    assert next(iter(remote.records.values()))["chunk_text"] == "Version A"


def test_reconciliation_repairs_missing_and_orphan_records_in_owned_prefix(tmp_path):
    settings, _, repository, remote, store = setup_pipeline(tmp_path)
    run(settings, repository, store)
    missing = next(iter(remote.records))
    remote.records.pop(missing)
    document_id = next(iter(repository.documents))
    remote.records[document_id + ":orphan"] = {"chunk_text": "stale"}
    remote.records["other-document:chunk"] = {"chunk_text": "unrelated"}
    assert not run(settings, repository, store, reconcile=True).failures
    assert missing in remote.records
    assert document_id + ":orphan" not in remote.records
    assert "other-document:chunk" in remote.records


def test_retrieval_rejects_stale_and_partial_index_hits(tmp_path):
    settings, _, repository, remote, store = setup_pipeline(tmp_path)
    run(settings, repository, store)
    service = RetrievalService(settings, vector_store=store, repository=repository)
    assert service.search("inflation").grounded
    for record in remote.records.values():
        record["index_version"] = "stale-version"
    assert not service.search("inflation").grounded


def test_reconciliation_uses_canonical_postgres_when_pdf_is_offline(tmp_path):
    settings, pdf, repository, remote, store = setup_pipeline(tmp_path)
    run(settings, repository, store)
    missing = next(iter(remote.records))
    remote.records.pop(missing)
    pdf.unlink()
    report = reconcile_corpus(
        settings,
        repository=repository,
        vector_store=store,
        count_tokens=lambda text: len(text.split()),
        tokenizer_id="fixture-exact:v1",
    )
    assert not report.failures
    assert missing in remote.records


def test_exact_counter_is_required_before_any_production_mutation(tmp_path):
    settings, _, repository, remote, store = setup_pipeline(tmp_path)
    with pytest.raises(ValueError, match="exact production tokenizer"):
        run_ingestion(settings, repository=repository, vector_store=store)
    assert not remote.records


def test_a_new_memory_store_does_not_reuse_an_old_instances_success(tmp_path):
    settings, _, repository, _, _ = setup_pipeline(tmp_path)
    first = InMemoryVectorStore(HashingEmbedder(32))
    run(settings, repository, first)
    restarted = InMemoryVectorStore(HashingEmbedder(32))
    assert run(settings, repository, restarted).documents_processed == 1
    assert first.count() == restarted.count() > 0


def test_blank_scan_waits_for_ocr_instead_of_becoming_successfully_empty(tmp_path):
    settings, pdf, repository, remote, store = setup_pipeline(tmp_path)
    pdf.unlink()
    make_pdf(pdf, ("",))
    assert run(settings, repository, store).documents_deferred == 1
    arrive(settings, pdf, "Enfin le texte OCR")
    assert run(settings, repository, store).documents_processed == 1
    assert remote.records


def test_bounded_runs_advance_past_previously_completed_pdfs(tmp_path):
    settings, _, repository, _, store = setup_pipeline(tmp_path)
    make_pdf(settings.resolved_raw_dir / "second.pdf", ("Deuxième document",))
    first = run(settings, repository, store, limit=1)
    second = run(settings, repository, store, limit=1)
    assert first.documents_processed == second.documents_processed == 1
    assert len(repository.documents) == 2


def test_a_bad_first_pdf_does_not_starve_later_documents_in_bounded_runs(tmp_path):
    settings, _, repository, _, store = setup_pipeline(tmp_path)
    (settings.resolved_raw_dir / "a-invalid.pdf").write_bytes(b"not a valid PDF")
    result = run(settings, repository, store, limit=1)
    assert len(result.failures) == 1
    assert result.documents_processed == 1


@pytest.mark.parametrize("discovery_outage", [True, False])
def test_langchain_cycle_runs_discovery_and_keeps_ingesting_during_outage(
    tmp_path, discovery_outage
):
    settings, _, repository, remote, store = setup_pipeline(tmp_path)
    called = []

    def discover(limit):
        called.append(limit)
        if discovery_outage:
            raise RuntimeError("WordPress unavailable")
        make_pdf(settings.resolved_raw_dir / "new.pdf", ("Nouveau rapport inflation",))

    workflow = build_ingestion_workflow(
        settings,
        repository=repository,
        vector_store=store,
        count_tokens=lambda text: len(text.split()),
        tokenizer_id="fixture-exact:v1",
        inventory_runner=discover,
    )
    result = workflow.invoke({"discover": True, "download_limit": 3})
    assert called == [3]
    assert bool(result["discovery_error"]) is discovery_outage
    assert not result["ingestion"].failures
    assert result["ingestion"].documents_processed == (1 if discovery_outage else 2)
    assert remote.records
