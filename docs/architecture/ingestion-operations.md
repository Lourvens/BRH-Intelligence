# Ingestion operations

The supported production path uses Pinecone integrated `multilingual-e5-large`
embeddings. Kaggle/PaddleOCR jobs are external producers; do not wait for the
whole corpus to finish extraction. The CLI consumes whatever is ready on each
cycle. ADR-0012 records the recovery guarantees and trade-offs.

## Configuration

Set these values in the repository `.env`; credentials remain untracked:

```dotenv
BRH_EMBEDDING_PROVIDER=pinecone
BRH_EMBEDDING_MODEL=multilingual-e5-large
BRH_EMBEDDING_DIM=1024
BRH_VECTOR_BACKEND=pinecone_integrated
BRH_PINECONE_INDEX_NAME=brh-intelligence
BRH_PINECONE_NAMESPACE=default
BRH_PINECONE_TEXT_FIELD=chunk_text
BRH_INDEX_BATCH_SIZE=96
BRH_INDEX_TIMEOUT=30
BRH_INDEX_MAX_RETRIES=3
BRH_EMBEDDING_TOKENIZER=intfloat/multilingual-e5-large
```

Also configure the existing Postgres and Pinecone API credentials. The exact
tokenizer is downloaded once and cached. Its SHA-256, including the passage
prefix contract, is recorded in document/vector versions. To freeze downloads
to an upstream release, set `BRH_EMBEDDING_TOKENIZER_REVISION` to its commit.
Index configuration is checked against the selected model and text field.

`default` is this application's named namespace; it is distinct from Pinecone's
special `__default__` namespace. Changing the namespace creates a separate
manifest target and requires indexing that destination.

## Commands

Bootstrap, if the index does not already exist:

```bash
uv sync --all-packages
make ingest ARGS="--migrate --provision-index --index --limit 1"
```

Provisioning creates a serverless index in AWS `us-east-1` by default, enables
deletion protection and disables embedding truncation. Override `--cloud` and
`--region` explicitly if needed. It never replaces an existing index.

Discovery through indexing, in bounded batches:

```bash
make ingest ARGS="--discover --download-limit 20 --index --limit 20"
```

Watch for new PDFs and newly copied OCR artifacts:

```bash
make ingest ARGS="--index --limit 20 --watch 60"
```

Add `--discover --download-limit 20` to refresh/download WordPress media each
cycle. Discovery and ingestion have separate limits. Completed documents do
not consume the ingestion limit, so successive runs advance through the store.
Failures also do not consume that successful-document limit, so a bad first
file cannot starve later sources. All URLs remain in the discovery ledger;
matching SHA-256 bytes share one
document. Stop watch mode with Ctrl+C; persisted work resumes on the next run.

Consume extraction artifacts without vector indexing:

```bash
make ingest ARGS="--limit 20"
```

Check and repair remote state, including persisted chunks whose PDF is offline:

```bash
make ingest ARGS="--index --reconcile"
```

This first processes available changed sources, then verifies the canonical
Postgres corpus. The latter pass requires stored chunks to match the current
tokenizer/chunker. If it reports a mismatch, bring the source PDF/OCR back and
rerun ingestion; it will rebuild the current version before indexing.
Matching records are reused. Missing records are written; stale IDs in the
owned document prefix are deleted. Other documents/namespaces are untouched.

Inspect retrieval without running a generation model:

```bash
uv run python -m brh_core.retrieval "Quelle est l'évolution de l'inflation ?"
```

For offline development, select `BRH_VECTOR_BACKEND=memory` and
`BRH_EMBEDDING_PROVIDER=hashing`. Memory state lasts only for that process;
test ingestion and retrieval together in one process.

## Operational state

Each cycle emits JSON reports. `documents_deferred` means a blank scan is
waiting for readable OCR. Failures return exit code 1 in one-shot mode and
remain eligible for a later watch cycle. Invalid/incomplete OCR is a failure,
never a successful empty index. OCR page markers must be unique, ordered and
match the PDF page count.

`corpus.processing_jobs` holds stage metrics and attempts. The index manifest
tracks destination, current version, checkpointed IDs, attempts and last error:

```sql
SELECT target, document_id, state->>'status' AS status,
       state->>'attempt' AS attempt, state->>'error' AS error, updated_at
FROM corpus.index_manifests
WHERE state->>'status' <> 'succeeded'
ORDER BY updated_at;
```

Enable normal `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY` and
`LANGSMITH_PROJECT=brh-intelligence` variables for LangChain cycle/retriever
traces. Per-document trace inputs include the source hash and tokenizer
identity; infrastructure objects and credentials are excluded.

## Verification

```bash
uv run pytest -q -m "not integration"
BRH_TEST_POSTGRES=1 uv run pytest -q packages/core/tests/test_ingestion_postgres.py
BRH_TEST_PINECONE=1 uv run pytest -q packages/core/tests/test_live_ingestion.py
```

The integration tests create uniquely named temporary databases. The live test
uses a unique test namespace in the configured index and deletes its test IDs
and temporary database afterward. The production namespace is not backfilled
by the smoke test. Connectivity/recovery tests are not retrieval relevance
scores; a corpus retrieval benchmark remains a separate evaluation task.
