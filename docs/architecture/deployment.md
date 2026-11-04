# Deployment topology

The public app is three runtime pieces plus managed services:

| Piece | Where | Notes |
| --- | --- | --- |
| Next.js app | Vercel (or another Node host) | Browser talks to the LangGraph URL; server routes proxy `/corpus/v1/*`. |
| Python agent + corpus API | Modal, `scripts/modal_agent.py` | One container serves `/threads`, `/runs` and `/corpus/v1/*`. |
| PostgreSQL | Neon, branch `production` | Pooled URL for runtime, direct URL for migrations and checker setup. |
| Object storage | Neon Object Storage, bucket `brh-publications` | `public_read`; OCR bundles and `<slug>.pdf` citations. |
| Retrieval | Pinecone + OpenRouter | `BRH_VECTOR_BACKEND=pinecone`; credentials stay in the Modal secret. |

`packages/core` is not a separate service. It is copied into the Modal image and installed as a uv workspace package, exactly as it is installed into every Python surface locally.

## Neon

```bash
neon link --project-id <project> --branch production
neon deploy                 # applies neon.ts, provisions brh-publications
make migrate                # uses DATABASE_URL_UNPOOLED for DDL
```

`neon.ts` declares the public-read bucket. Neon's pooler rejects `search_path` in
startup options, so `brh_core.db.pool` applies it with `SET search_path` on each
pooled session. The checkpointer uses `DATABASE_URL` at runtime and
`DATABASE_URL_UNPOOLED` for `setup()`.

## Modal

```bash
uvx --with python-dotenv modal deploy scripts/modal_agent.py
uvx --with python-dotenv modal run scripts/modal_agent.py::sync_corpus
uvx --with python-dotenv modal run scripts/modal_agent.py::upload_pdfs
```

`sync_corpus` reads the existing `brh-ocr` volume, publishes OCR bundles into
the Neon bucket, and updates the publication backend. `upload_pdfs` writes source
PDFs at `<slug>.pdf` so `BRH_PUBLIC_PDF_BASE_URL` citation links resolve. The
current volume has source PDFs for 767 of 1,076 documents; OCR-only documents
still render their extracted text but have no PDF deep link until their source
file is added to the volume.

The web server runs `langgraph dev` inside the Modal container. That is the
in-memory Agent Server shipped with the CLI; it is suitable for this demo. A
production migration should move to the licensed Agent Server with the same
Postgres checkpointer and a Redis pub/sub backend.

## Web environment

Set these on the frontend host:

```dotenv
NEXT_PUBLIC_LANGGRAPH_URL=https://<modal-app>.modal.run
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=agent
BRH_CORPUS_API_URL=https://<modal-app>.modal.run
NEXT_PUBLIC_SITE_URL=https://<public-origin>
```

The Agent Server allows CORS from `*` by default. The deployment sets both
`CORS_ALLOW_ORIGINS` (the Agent Server) and `BRH_CORS_ALLOWED_ORIGINS` (the
custom Starlette app) to `https://brh-intelligence.vercel.app` plus
`http://localhost:3000` for local development. Remove localhost from the
production environment if only the hosted frontend should call the service.

Request limits and thread context budgets are also environment-driven:

```dotenv
BRH_RATE_LIMIT_ENABLED=true
BRH_RATE_LIMIT_WINDOW_SECONDS=60
BRH_RATE_LIMIT_TRUST_PROXY=true
BRH_RATE_LIMIT_GLOBAL_REQUESTS=600
BRH_RATE_LIMIT_AGENT_REQUESTS=120
BRH_RATE_LIMIT_AGENT_RUNS=6
BRH_RATE_LIMIT_CORPUS_REQUESTS=120
BRH_RATE_LIMIT_SEARCH_REQUESTS=10
BRH_AGENT_MAX_CONTEXT_TOKENS=12000
BRH_AGENT_MAX_CONTEXT_MESSAGES=40
```

The limiter is per client IP and in-process; the Modal function is pinned to
one container. `langgraph.json`'s Starlette middleware runs for both the
built-in Agent Server routes and `/corpus/v1/*`.


## Verification

```bash
curl -fsS https://<modal-app>.modal.run/ok
curl -fsS https://<modal-app>.modal.run/corpus/v1/stats
curl -fsS https://<modal-app>.modal.run/corpus/v1/ready
```

`/corpus/v1/ready` requires every current document to have a publication whose
manifest is readable from the configured storage backend. A 503 with
`artifact_storage: false` means the OCR sync or bucket credentials are incomplete,
not that Postgres is down.
