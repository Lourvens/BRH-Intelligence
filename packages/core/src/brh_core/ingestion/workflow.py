"""LangChain orchestration of one incremental discovery and ingestion cycle."""

import logging

from langchain_core.runnables import RunnableLambda

from brh_core.ingestion.pipeline import run_ingestion

logger = logging.getLogger(__name__)


def build_ingestion_workflow(
    settings,
    *,
    repository,
    vector_store=None,
    count_tokens=None,
    tokenizer_id=None,
    inventory_runner=None,
    inventory_ledger=None,
    stop=None,
):
    """Capture infrastructure once; runnable inputs contain only cycle options."""

    def discover(options):
        inventory = None
        error = None
        if options.get("discover"):
            try:
                runner = inventory_runner
                if runner is None:
                    from brh_core.inventory.pipeline import run_inventory

                    def runner(limit):
                        if inventory_ledger is None:
                            raise ValueError("Discovery requires an inventory ledger")
                        return run_inventory(settings, ledger=inventory_ledger, limit=limit)

                inventory = runner(options.get("download_limit"))
            except Exception as exc:
                # New OCR can still be consumed during a WordPress outage.
                logger.exception("Discovery failed; processing locally available artifacts")
                error = str(exc)
        return {"options": options, "inventory": inventory, "discovery_error": error}

    def ingest(payload):
        options = payload["options"]
        report = run_ingestion(
            settings,
            repository=repository,
            vector_store=vector_store,
            count_tokens=count_tokens,
            tokenizer_id=tokenizer_id,
            raw_dir=options.get("raw_dir"),
            force=options.get("force", False),
            limit=options.get("limit"),
            reconcile=options.get("reconcile", False),
            from_ocr=options.get("from_ocr", False),
            workers=options.get("workers"),
            stop=stop,
        )
        return {
            "inventory": payload["inventory"],
            "discovery_error": payload["discovery_error"],
            "ingestion": report,
        }

    return (
        RunnableLambda(discover, name="brh.discovery")
        | RunnableLambda(ingest, name="brh.ingestion")
    ).with_config(
        run_name="brh.ingestion.cycle",
        tags=["ingestion"],
        metadata={
            "embedding_model": settings.embedding_model,
            "vector_backend": settings.vector_backend.value,
            "namespace": settings.pinecone_namespace,
            "tokenizer_id": tokenizer_id,
        },
    )
