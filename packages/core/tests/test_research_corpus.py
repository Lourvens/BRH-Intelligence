"""Reading artifacts, evidence validation and paid-provider contracts stay offline."""

import json

import httpx
import pytest
from brh_core.corpus.artifacts import ArtifactStore, official_pdf
from brh_core.corpus.evidence import page_parts, validate_proposal
from brh_core.corpus.extraction_models import ExtractionPolicy, ExtractionProposal
from brh_core.corpus.metadata import clean_title, covered_period, family_for
from brh_core.corpus.providers import OpenRouterGraphClient
from brh_core.corpus.sync import project_artifact


def artifact_fixture(root, markdown="<!-- page 1 -->\n\n# Inflation\nBRH mesure les prix."):
    directory = root / ("a" * 64)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "document.md").write_text(markdown)
    (directory / "meta.json").write_text(
        json.dumps(
            {
                "sha256": "a" * 64,
                "engine": "paddleocr-vl",
                "pages": 1,
                "finished_at": "2026-10-25T00:00:00Z",
                "source": "/kaggle/private/file.pdf",
            }
        )
    )
    return ArtifactStore(root).document("a" * 64)


def proposal_fixture():
    return ExtractionProposal.model_validate(
        {
            "entities": [
                {
                    "ref": "a",
                    "label": "BRH",
                    "kind": "institution",
                    "surface": "BRH",
                    "aliases": [],
                    "quote": "BRH mesure les prix.",
                },
                {
                    "ref": "b",
                    "label": "Prix",
                    "kind": "indicator",
                    "surface": "prix",
                    "aliases": [],
                    "quote": "BRH mesure les prix.",
                },
            ],
            "relationships": [
                {
                    "subject": "a",
                    "object": "b",
                    "predicate": "measures",
                    "quote": "BRH mesure les prix.",
                    "temporal_context": None,
                }
            ],
        }
    )


def test_official_source_urls_and_no_runner_paths(tmp_path):
    artifact = artifact_fixture(tmp_path)
    record = project_artifact(artifact, {"document": None, "aliases": []})
    assert record["source_urls"] == []
    assert record["uploaded_at"] is None
    assert "source" not in record["metadata"]
    assert official_pdf("https://www.brh.ht/report.pdf#old", 3).endswith("#page=3")
    for url in (
        "file:///kaggle/private.pdf",
        "https://brh.ht.evil.test/x.pdf",
        "javascript:alert(1)",
        "https://evil@www.brh.ht/x.pdf",
    ):
        assert official_pdf(url) is None


def test_assets_are_confined_and_reject_active_content(tmp_path):
    artifact = artifact_fixture(tmp_path)
    assets = artifact.markdown.parent / "assets"
    assets.mkdir()
    (assets / "safe.png").write_bytes(b"png")
    outside = tmp_path / "secret.png"
    outside.write_bytes(b"secret")
    (assets / "escape.png").symlink_to(outside)
    store = ArtifactStore(tmp_path)
    assert store.asset("a" * 64, "safe.png").read_bytes() == b"png"
    for path in ("../meta.json", "/etc/passwd", "escape.png", "active.svg"):
        with pytest.raises(ValueError):
            store.asset("a" * 64, path)


def test_metadata_keeps_period_and_upload_date_distinct():
    assert covered_period("Avant-propos", "exercice fiscal 2004-2005")[1] == [2004, 2005]
    assert covered_period("Rapport", "Publié en ligne en 2018")[1] == []
    assert family_for("Circulaire 95-1A") == "circular"
    assert clean_title("![](assets/p001/chart.png)") is None
    assert clean_title("0" * 64) is None
    assert clean_title("Rapport &amp; bilan") == "Rapport & bilan"


def test_every_evidence_quote_and_both_endpoints_must_be_on_page():
    proposal = proposal_fixture()
    validate_proposal(proposal, "BRH mesure les prix.")
    with pytest.raises(ValueError):
        validate_proposal(proposal, "BRH ne mesure pas les prix.")
    bad = proposal.model_copy(
        update={
            "relationships": (proposal.relationships[0].model_copy(update={"object": "invented"}),)
        }
    )
    with pytest.raises(ValueError):
        validate_proposal(bad, "BRH mesure les prix.")


def test_page_segmentation_never_drops_characters():
    for text in ("a" * 26000, "\n" * 25000, ("BRH mesure les prix.\n\n" * 2000)):
        parts = page_parts(text)
        assert "".join(parts) == text
        assert all(len(part) <= 12001 for part in parts)


def test_openrouter_uses_strict_schema_and_actual_jev_noul_contract():
    calls = []
    proposal = proposal_fixture()

    def respond(request):
        calls.append(json.loads(request.content))
        if request.url.path.endswith("completions"):
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "finish_reason": "stop",
                            "message": {"content": proposal.model_dump_json()},
                        }
                    ],
                    "model": "fixture",
                    "usage": {},
                },
            )
        return httpx.Response(
            200,
            json={
                "answers": {"r0": {"type": "noul", "noul": 0.98}},
                "model": "typesafe/jev-1.14",
                "usage": {},
            },
        )

    client = OpenRouterGraphClient(
        "test-key",
        "fixture",
        "typesafe/jev-1.14",
        client=httpx.Client(transport=httpx.MockTransport(respond)),
    )
    result, _ = client.extract("BRH mesure les prix.")
    scores, _ = client.judge(result, "BRH mesure les prix.")
    assert scores == [0.98]
    assert calls[0]["provider"]["require_parameters"] is True
    assert calls[0]["response_format"]["json_schema"]["strict"] is True
    assert calls[1]["questions"]["r0"]["type"] == "noul"
    client.close()


def test_policy_has_no_implicit_publication_approval():
    policy = ExtractionPolicy(model="fixture", accept_probability=0.95, reject_probability=0.2)
    assert not policy.approved


def test_candidate_aliases_must_actually_occur_in_the_source():
    proposal = proposal_fixture()
    invalid = proposal.model_copy(
        update={
            "entities": (
                proposal.entities[0].model_copy(update={"aliases": ("Invented bank",)}),
                proposal.entities[1],
            )
        }
    )
    with pytest.raises(ValueError):
        validate_proposal(invalid, "BRH mesure les prix.")


def test_jev_nan_cannot_turn_into_a_published_assertion():
    def respond(request):
        return httpx.Response(200, json={"answers": {"r0": {"type": "noul", "noul": True}}})

    client = OpenRouterGraphClient(
        "fixture", "fixture", "fixture", client=httpx.Client(transport=httpx.MockTransport(respond))
    )
    with pytest.raises(ValueError):
        client.judge(proposal_fixture(), "BRH mesure les prix.")
    client.close()


def test_unfiltered_semantic_search_does_not_enumerate_all_corpus_ids():
    from types import SimpleNamespace

    from brh_core.config import Settings
    from brh_core.corpus.models import CorpusQuery
    from brh_core.retrieval.service import RetrievalService

    class Queries:
        def eligible_document_ids(self, query):
            raise AssertionError("Broad semantic search must not enumerate an unbounded ID filter")

    service = RetrievalService(
        Settings(_env_file=None),
        vector_store=None,
        repository=SimpleNamespace(get_documents=lambda ids: {}),
        research=SimpleNamespace(queries=Queries()),
    )
    calls = []
    service.retrieve = lambda q, **kwargs: calls.append(kwargs) or []
    assert service.semantic_corpus(CorpusQuery(q="inflation", mode="semantic"))["bounded"]
    assert calls[0]["filter"] is None


def test_index_coverage_uses_the_real_manifest_host_without_remote_calls():
    from brh_core.config import Settings
    from brh_core.corpus.status import configured_index_target

    settings = Settings(
        _env_file=None,
        vector_backend="pinecone",
        pinecone_index_name="brh-qwen",
        pinecone_namespace="research",
    )
    target = (
        "pinecone-vectors:https://brh-qwen-project.svc.test.pinecone.io:research:1024:chunk_text"
    )
    assert configured_index_target(settings, [target]) == target
    assert configured_index_target(settings, [target.replace("research:1024", "old:1024")]) is None
    other = target.replace("-project.", "-another.")
    assert configured_index_target(settings, [target, other]) is None
