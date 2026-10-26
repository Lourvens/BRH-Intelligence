# Markdown research corpus

Implemented 2026-10-25. Decisions: ADR-0014 and ADR-0015 (published snapshots).

Updated 2026-10-26. Context7 confirmed custom `http.app` / lifespan integration.
The stable environment uses LangGraph 1.2.17, CLI 0.4.40, API 0.16.7,
runtime-inmem 0.36.7 and Python SDK 0.4.9, locked by uv.

## Run locally

```bash
make migrate
make corpus-sync
make corpus-dev
# In another terminal:
make web-dev
```

Open `/brh-corpus`. `make corpus-dev` serves only the research HTTP routes on
2024. Alternatively `make agent-dev` mounts those same routes through
`services/agent/langgraph.json`; do not run both on the same port. Agent generation
is not required for catalogue reading. `BRH_CORPUS_API_URL` is a server-only web
setting and defaults to `http://127.0.0.1:2024`.

`make corpus-sync ARGS="--watch 30"` periodically imports completed OCR artifacts.
It never requests embeddings or LLM completions. Import and graph tables are
independent of the running embedding backfill. A blank artifact is deferred.

## Content and public reads

`data/ocr/<sha256>/document.md`, `meta.json` and `assets/` are the durable publishing
input. Postgres `research_documents` and `research_pages` are the published reading
and search projection. The importer validates completion and page markers, records the
Markdown hash, preserves editorial title/family overrides and obtains official
PDF URLs from `crawl_urls`/canonical document records by SHA-256. It does not
promote upload timestamps to publication dates.

All HTTP handlers call `RetrievalService`. Browse reads initialize no vector
client. Physical pages and reader metadata come from one Postgres snapshot, with
no OCR filesystem dependency. Unpublished local edits remain invisible until
sync promotes their complete bundle. Publication manifests pin figure content;
scripts/SVG, unlisted assets, traversal and symlink escapes are rejected.
The web reader uses GFM, parses retained HTML tables and then sanitizes the tree.
PDFs link directly to brh.ht with a physical page fragment; no PDF proxy is needed.

The public prefix is `/corpus/v1` in Python and `/api/corpus` in Next.js:

| Route | Result |
| --- | --- |
| `/documents` | Bounded metadata/page-text search, total, page and page size |
| `/facets` | Family counts and known covered-period years |
| `/search` | Bounded semantic candidates through canonical retrieval |
| `/stats` | Separately scoped inventory, readable, active-index and graph counts |
| `/documents/{slug}` | Public metadata and official source aliases |
| `/documents/{slug}/pages/{number}` | Current Markdown for one physical PDF page |
| `/documents/{slug}/reader/{number}` | Metadata and page in one database snapshot |
| `/documents/{slug}/assets/{path}` | Current raster figure; revalidate cache |
| `/documents/{slug}/versions/{id}/assets/{path}` | Immutable figure; checksum ETag |
| `/documents/{slug}/versions/{id}/markdown` | Markdown download with provenance |
| `/ready` | Database, publication and storage readiness (Python API only) |
| `/entities` | Bounded entity/alias search; optional kind/document/family/year filters |
| `/entities/{id}` | Profile and current supporting passages |
| `/entities/{id}/graph` | One/two-hop accepted relationship neighbourhood |
| `/entities/{id}/passages` | Evidence selected through the local graph |

Search parameters: `q`, `mode=metadata|text|entities`, `family`, `year`,
`document_id`, `entity_id`, `kind`, `relationship`, `sort=title|recent|period`,
`page` and `page_size` (1–100). Graph reads additionally accept `hops=1|2`.
Semantic mode uses `/search`, returns up to 20 ranked candidates with
`bounded=true`, and does not claim an exhaustive count. Narrowed scopes are
resolved before vector retrieval, with a 1,000-ID bound. Broad search does not
enumerate all document IDs. Semantic requests have a 10/minute/process budget.
Unknown/bad parameters produce 400, absent resources 404, unpublished documents 409,
and storage failures 503. A failed request never becomes an empty catalogue.
Source paths, raw provider failures and credentials are not returned.

## Artifact storage and publication

Relative Python data directories resolve against `BRH_DATA_ROOT`, otherwise the
nearest `.env` directory, otherwise the uv workspace root, otherwise CWD. Absolute
paths stay absolute. `BRH_DATA_ROOT` is the base for paths such as `data/ocr`, not
the OCR directory itself. This gives `make agent-dev` and ingestion the same paths.

`BRH_ARTIFACT_BACKEND=local` stores bundles under `BRH_PUBLICATION_DIR` (default
`data/published`, gitignored). Each immutable bundle lives at
`ocr/<pdf-sha>/<bundle-hash>/`, including original Markdown, public completion
metadata, raster assets and a completion manifest uploaded last. Markdown hashes
identify text evidence; bundle hashes also include assets/metadata. Each object
is verified before atomic database promotion under a per-document publisher lock.
Failed uploads or SQL transactions retain the previous publication. Text changes
invalidate graph evidence; unchanged text with new figures preserves it.

For deployment, set `BRH_ARTIFACT_BACKEND=s3`, `BRH_ARTIFACT_S3_BUCKET` and optionally
`BRH_ARTIFACT_S3_ENDPOINT` / `BRH_ARTIFACT_S3_REGION`. The boto3 adapter uses standard
SDK credentials, conditional immutable writes and content verification. It does
not provision a bucket. The publisher needs read/write access; API instances need
only read access to that same bucket. Alternatively mount the same durable local
publication directory on each API replica. No OCR mount is required for serving.

Apply migration 0006 and run `make corpus-sync` before rolling out snapshot readers.
Use the same publication backend/location across writers and API replicas.
Switching a storage location requires copying and verifying retained bundles
before switching readers; changing configuration alone does not migrate objects.
Keep Postgres backups and artifact storage backups/versioning together. After
restoring them, call `/corpus/v1/ready`, then verify sample page, figure and
Markdown download checksums. The readiness probe checks one active manifest and
unpublished counts; it is not a full backup-integrity audit.

`sync` logs changed/deferred/failed counts; readiness exposes last sync time and
publication coverage. HTTP error logs include error type and resource path.
Immutable bundles are retained, including uploads orphaned by failed promotion;
no automatic cleanup removes previous publications. A future garbage collector
must retain every database-referenced bundle and apply an explicit grace period.
For a model-free restore, rebuild publications from retained OCR artifacts, then
restore reviewed graph records only when their Markdown hash matches.

## Graph extraction

At the user's request, both extraction and Jev reuse the existing
`OPENROUTER_EMBEDDING_API_KEY`. This does not change the embedding model or worker.
The key must allow chat completions and the Decisions API as well as embeddings.

The model and acceptance thresholds are explicit inputs, with no production
defaults. The evaluation notebook is
`experiments/notebooks/0006-research-graph.ipynb`; its candidate policy is not an
approval. After human review of the evaluation, supply a policy containing:

```json
{
  "model": "<reviewed model ID>",
  "validator_model": "typesafe/jev-1.14",
  "accept_probability": 0.95,
  "reject_probability": 0.2,
  "approved_by": "<reviewer>",
  "evaluation_reference": "<reviewed report>",
  "entities": []
}
```

The numbers above illustrate the shape; calibrate them against the reviewed
French dataset before approval. Optional reviewed entities contain `label`,
`kind` and `aliases`; these establish explicit cross-document identity. Without
them, entity identity remains document-scoped to avoid merging homonyms.

```bash
make corpus-extract ARGS="--policy /path/to/reviewed-policy.json --limit 5 --allow-paid"
```

`--document <slug-or-id>` selects one document. Bounded invocations advance through
unfinished documents, and identical completed page parts are reused. A separate
research advisory lock prevents concurrent graph writers for the same document.
Each extraction proposal is checkpointed before Jev, so a validation failure can
resume without re-requesting generation. Transient provider errors have bounded
retries; authentication, credit and persistent errors stop the command.

Every entity/relationship must quote exact source text; relationship quotes must
contain both endpoint surfaces. Jev returns a Noul support probability, not a
confidence field. Accepted/pending/rejected assertions retain that probability,
time qualification, source page, artifact version and model/provider/prompt/policy
provenance. Low-probability assertions are rejected; uncertainty stays pending.
Only accepted, current assertions enter public traversal. Changing Markdown
removes that artifact's old graph rows during sync. Public graph reads also check
the active published Markdown hash; unpublished edits never replace evidence.

V1 bounds traversal to two hops, 100 nodes and 200 edges; responses report
truncation. The evidence list is keyboard accessible and mirrors the network.
Co-occurrence does not become a factual relationship. Automatically checked
assertions remain claims made by particular sources, not certified global facts.

## Verification

```bash
uv run pytest packages/core/tests/test_research_corpus.py services/agent/tests/test_corpus_http.py
BRH_TEST_POSTGRES=1 uv run pytest packages/core/tests/test_research_postgres.py
cd apps/web && bun test tests/corpus.test.tsx && bun run typecheck
```

The Postgres suite creates/drops isolated databases, reruns migrations and checks
French search, extraction resume, graph evidence and stale-content invalidation.
Provider contracts run against HTTP fakes offline. Broader community summaries,
global GraphRAG answers and quality claims require the later reviewed evaluation.
