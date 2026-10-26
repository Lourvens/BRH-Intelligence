"""Explicit offline import and opt-in paid extraction commands."""

import argparse
import json
import logging
import time

from brh_core.config import get_settings
from brh_core.corpus.extraction import extract_document
from brh_core.corpus.extraction_models import ExtractionPolicy
from brh_core.corpus.providers import OpenRouterGraphClient
from brh_core.corpus.storage import publication_storage
from brh_core.corpus.sync import sync_artifacts
from brh_core.db.pool import open_pool
from brh_core.db.research_extraction import ResearchExtractionRepository
from brh_core.db.research_import import ResearchImportRepository
from brh_core.db.research_query import ResearchQueryRepository


def main():
    parser = argparse.ArgumentParser(description="Markdown corpus research operations")
    commands = parser.add_subparsers(dest="command", required=True)
    sync = commands.add_parser("sync", help="Import OCR Markdown; no embedding or LLM calls")
    sync.add_argument("--watch", type=int, default=0)
    extract = commands.add_parser(
        "extract", help="Paid extraction using the existing OpenRouter key"
    )
    extract.add_argument("--policy", required=True, type=argparse.FileType("r"))
    extract.add_argument("--limit", type=int, default=1)
    extract.add_argument("--document", help="Document slug or ID")
    extract.add_argument("--allow-paid", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    with open_pool(settings) as pool:
        if args.command == "sync":
            if args.watch and args.watch < 5:
                parser.error("--watch must be zero or at least 5 seconds")
            while True:
                print(
                    json.dumps(
                        sync_artifacts(
                            settings.resolved_ocr_dir,
                            ResearchImportRepository(pool),
                            publication_storage(settings),
                        )
                    )
                )
                if not args.watch:
                    break
                time.sleep(args.watch)
            return
        if not args.allow_paid:
            parser.error("Extraction requires --allow-paid; sync never submits paid requests")
        if not 1 <= args.limit <= 100:
            parser.error("--limit must be between 1 and 100")
        policy = ExtractionPolicy.model_validate_json(args.policy.read())
        if not policy.approved:
            parser.error("Production extraction needs an approved policy with evaluation reference")
        client = OpenRouterGraphClient(
            settings.openrouter_embedding_api_key.get_secret_value(),
            policy.model,
            policy.validator_model,
        )
        queries = ResearchQueryRepository(pool)
        repository = ResearchExtractionRepository(pool)
        try:
            identifiers = (
                [args.document]
                if args.document
                else repository.pending_documents(policy, args.limit)
            )
            documents = [queries.document(identifier) for identifier in identifiers]
            for document in documents:
                if document is None:
                    parser.error("Unknown document")
                result = extract_document(
                    document,
                    queries.pages(document.document_id),
                    client=client,
                    repository=repository,
                    policy=policy,
                )
                print(json.dumps({"slug": document.slug, **result}))
        finally:
            client.close()


if __name__ == "__main__":
    main()
