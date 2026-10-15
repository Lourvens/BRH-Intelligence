# Plan: BRH document inventory (discover → download → ledger)

- **Date**: 2026-10-14
- **Status**: Implemented — see `brh_core.inventory` and migration `0002_inventory.sql`
- **Feeds**: `brh_core.ingestion` (discovery stage), ADR-0003 (Postgres), ADR-0005 (page-aware PDFs)

## Goal

Maintain a **traceable, deduplicated inventory of every BRH document**: discover
documents on `brh.ht`, download the originals, and record one ledger row per
document with its identity, dates, and fetch status — so a document is never
downloaded twice and every artifact can be traced back to its source.

Bulk-backfill once, then pull only what changed on a schedule.

## What this task is, and is not

| In scope (this task) | Out of scope (later tasks) |
|---|---|
| Discover documents on `brh.ht` | Parse / OCR |
| Download originals to local storage | Chunk / embed / index |
| Ledger row per document (dates, status, hash) | Classification / taxonomy |
| Idempotent re-runs; incremental (new/changed only) | Retrieval, agent, MCP |

The inventory is the **front half** of the pipeline. It ends when a document is
on disk with a ledger row; parsing/indexing consumes it afterwards.

## What we measured (2026-10-14, live)

| Probe | Result | Implication |
|---|---|---|
| `robots.txt` | `User-agent: *` → `Disallow:` (empty) | Crawling allowed; we still identify + rate-limit |
| `GET /wp-json/` | `wp/v2` present; site is WordPress | Use the structured REST API, not HTML scraping |
| `media?mime_type=application/pdf` | `X-WP-Total: 1171` | **1171 PDFs** — the document universe |
| `media?media_type=application` | `X-WP-Total: 1331` | 160 non-PDF application files (Office docs, zips) |
| `posts` / `pages` | 583 / 308 | HTML documents, a separate (later) source |
| `media?...&modified_after=<date>` | `after` and `modified_after` both work | **Incremental discovery is a one-parameter call** |
| `media?...&orderby=modified&order=desc` | newest first (e.g. `serie-tma-2026-2027.pdf`) | Cheap "what's new" poll |
| `HEAD` on a PDF | `Last-Modified` ✓, `Content-Length` ✓, `Accept-Ranges: bytes`, **no `ETag`** | Cheap change check via `If-Modified-Since` + size; no strong validator |
| `media_type=application/pdf` | **HTTP 400** | The sibling design doc is wrong; the enum is `image\|video\|text\|application\|audio` |

> Aside: the API root lists an `mcp` namespace. Noted, not chased — the REST
> API is sufficient for discovery.

## Decision questions (resolve by experiment, then ADR)

| # | Question | Options | Leaning |
|---|---|---|---|
| D1 | **Discovery source** | WP REST `media` API · HTML crawl of `/publications/` · Firecrawl `/map` · sitemap | WP REST API — structured, paginated, free, gives dates + `source_url` |
| D2 | **Document identity** (dedupe) | `sha256(bytes)` · `source_url` · WP `id` · `(url, last_modified, content_length)` | `sha256` is the only true identity; the rest are cheap skip-hints |
| D3 | **Fetching** | `httpx` streaming · Firecrawl `/scrape` · Scrapy | `httpx` — files are plain `application/pdf`, no JS needed (contra sibling ADR-0031) |
| D4 | **Incremental** | WP `modified_after` watermark · re-list all + diff hashes · conditional GET | `modified_after` first, conditional GET as a second guard |
| D5 | **Volume / storage** | — (measure) | **Measured (n=25 sample): mean 1.5 MB, median 0.2 MB, max 6.3 MB → ≈0.3–1.8 GB** for 1171 PDFs |
| D6 | **Politeness** | concurrency, delay, retries, UA | 1–2 concurrent, ≥0.5 s delay, identify UA, retry 5xx/429 with backoff |
| D7 | **Schedule** | Modal cron · LangGraph cron · GitHub Actions · systemd | Decide with deployment (ADR-0009); `--incremental` is the unit it calls |

## Proposed design (draft — the experiment may change it)

**Two layers.**

1. **Discovery ledger** (`crawl_runs` + `crawl_urls`) — one row per *URL seen*,
   with lifecycle status. Answers "have I seen this, and what happened?".
2. **Artifacts** (`documents`, content-addressed) — one row per *unique byte
   stream*, keyed by `sha256`. Raw bytes at `data/raw/web/<sha256>.pdf`.

**Status lifecycle** (per URL): `pending → fetched → (parsed → indexed)`, or
`failed` / `superseded`. Only `pending/fetched/failed` are this task's concern.

**Idempotency.** `sha256` is the natural key for an artifact (ADR-0003). The URL
row is unique per `(crawl_run_id, url)`. Re-running the pipeline never writes a
second copy of the same bytes.

**Incremental run.**
1. `watermark = max(modified_gmt)` in the ledger (or `--since`).
2. `GET media?mime_type=application/pdf&modified_after=<watermark>&orderby=modified`.
3. For each candidate: `HEAD` → skip when `Last-Modified` + `Content-Length`
   match the ledger; else stream-download, hash, record.

**Raw layout.** Content-addressed so dedupe is free and re-runs are safe:
`data/raw/web/<sha256>.pdf`. A short `source_url → sha256` index lives in the DB.

## Schema sketch (draft — the experiment may change it)

> **As built.** The shipped schema is
> `packages/core/src/brh_core/db/migrations/0002_inventory.sql`. It keeps
> `crawl_runs` as sketched, but differs on `crawl_urls`: the table is keyed by
> `url` alone and holds the *current* state of each URL (not one row per run),
> and carries `wp_date`/`wp_modified` for the incremental watermark. There is no
> `documents` foreign key — the parsed-artefact table stays owned by the later
> ingestion stage; the inventory records `sha256` + `raw_path` directly.

```sql
-- discovery runs
CREATE TABLE corpus.crawl_runs (
    crawl_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope        TEXT NOT NULL,              -- 'brh.ht/media/pdf'
    mode         TEXT NOT NULL,              -- 'bulk' | 'incremental'
    watermark    TIMESTAMPTZ,                -- modified_after used, if any
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at  TIMESTAMPTZ,
    status       TEXT NOT NULL DEFAULT 'running',
    counts       JSONB NOT NULL DEFAULT '{}'::jsonb,
    error        TEXT
);

-- one row per URL discovered
CREATE TABLE corpus.crawl_urls (
    crawl_url_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawl_run_id UUID NOT NULL REFERENCES corpus.crawl_runs ON DELETE CASCADE,
    url          TEXT NOT NULL,
    wp_id        INTEGER,
    status       TEXT NOT NULL DEFAULT 'pending',
    http_status  INTEGER,
    last_modified TIMESTAMPTZ,
    content_length BIGINT,
    sha256       CHAR(64),                   -- set once fetched
    document_id  UUID REFERENCES corpus.documents(document_id),
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fetched_at   TIMESTAMPTZ,
    error        TEXT,
    UNIQUE (crawl_run_id, url)
);

-- artifact provenance appended to documents
ALTER TABLE corpus.documents
    ADD COLUMN IF NOT EXISTS wp_id INTEGER,
    ADD COLUMN IF NOT EXISTS last_modified TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS content_length BIGINT,
    ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS http_status INTEGER,
    ADD COLUMN IF NOT EXISTS raw_path TEXT;
```

## Experiment queue

| # | Notebook | Question | Feeds |
|---|---|---|---|
| 0002 | `brh-discovery` | D1, D4, D5, D6 | this plan's design + the discovery ADR |
| 0003 | `brh-identity` | D2, D3 | dedupe key + fetch approach |
| 0004 | `brh-bulk-download` | D5, D6 at scale | throughput, politeness, storage |

Only 0002 is written now. Run it, read the numbers, then decide whether 0003/0004
are needed before coding.

## ADRs to write **before** implementation

- **Discovery source** — WP REST `media` API over HTML crawl / Firecrawl.
- **Document identity** — `sha256` content addressing + URL/provenance ledger.
- **Raw artifact storage** — `data/raw/web/<sha256>.<ext>`, DB-indexed.
- **Incremental + schedule** — watermark semantics and the cron unit.

## Risks

- **Storage**: measured ≈0.3–1.8 GB for the PDF corpus (experiment 0002). Small
  enough for a single bulk pull; still backfill in batches to bound blast radius.
- **Junk in `media`**: 1171 PDFs likely include non-publications (forms, logos,
  circulars). The inventory logs everything; *classification* filters later.
- **Duplicate bytes, different URLs**: **already observed** — the sample returned
  the same `organigramme-brh-version-aout-20` PDF (6.32 MB) twice. Confirms the
  ledger must allow *many URLs → one artifact*, keyed by `sha256`.
- **Dates disagree**: PDF publication date ≠ WP upload date ≠ `Last-Modified`
  (e.g. `SNIF.pdf` is `Last-Modified 2024-08-31`). Record all three; trust none.
- **No `ETag`**: change detection is `Last-Modified` + `Content-Length` only.
  Weaker than a hash — hence hashing after download.
- **Politeness/ToS**: public-sector content, permissive `robots.txt`, but keep
  concurrency low and identify the client.
- **Site slowness / timeouts**: observed in earlier analysis — bounded retries.
