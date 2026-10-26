"""Resumable page-level extraction independent of embedding work."""

import hashlib
import json

from brh_core.corpus.evidence import page_parts, validate_proposal
from brh_core.corpus.extraction_models import PROMPT_VERSION, ExtractionProposal


def extraction_key(document, page, part, policy) -> str:
    identity = json.dumps(
        {
            "document": document.document_id,
            "artifact": document.artifact_hash,
            "page": page,
            "part": hashlib.sha256(part.encode()).hexdigest(),
            "policy": policy.model_dump(mode="json"),
            "prompt": PROMPT_VERSION,
        },
        sort_keys=True,
    )
    return hashlib.sha256(identity.encode()).hexdigest()


def extract_document(document, pages, *, client, repository, policy) -> dict:
    counts = {"completed": 0, "reused": 0}
    with repository.lock(document.document_id):
        for page in pages:
            for part in page_parts(page["markdown"]):
                key = extraction_key(document, page["page_number"], part, policy)
                saved = repository.load(key)
                if saved and saved["status"] == "succeeded":
                    counts["reused"] += 1
                    continue
                provenance = dict(saved["provenance"]) if saved else {}
                provenance["policy"] = policy.model_dump(mode="json")
                repository.checkpoint(
                    key, document, page["page_number"], status="running", provenance=provenance
                )
                try:
                    if saved and saved.get("proposal"):
                        proposal = ExtractionProposal.model_validate(saved["proposal"])
                    elif part.strip():
                        proposal, extraction = client.extract(part)
                        validate_proposal(proposal, part)
                        provenance["extraction"] = extraction
                        repository.checkpoint(
                            key,
                            document,
                            page["page_number"],
                            status="running",
                            proposal=proposal,
                            provenance=provenance,
                        )
                    else:
                        proposal = ExtractionProposal(entities=(), relationships=())
                    validate_proposal(proposal, part)
                    probabilities, judgment = client.judge(proposal, part)
                    if len(probabilities) != len(proposal.relationships):
                        raise ValueError("Missing relationship judgments")
                    provenance.update(validation=judgment, policy=policy.model_dump(mode="json"))
                    repository.save(
                        key,
                        document,
                        page["page_number"],
                        proposal,
                        probabilities,
                        policy,
                        provenance,
                    )
                    counts["completed"] += 1
                except Exception as exc:
                    repository.checkpoint(
                        key,
                        document,
                        page["page_number"],
                        status="failed",
                        provenance=provenance,
                        error=type(exc).__name__,
                    )
                    raise
    return counts
