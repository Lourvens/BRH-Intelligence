# AGENTS.md

Repo-specific guidance for agents. Read [`PROGRESSION.md`](PROGRESSION.md) first —
it holds current state, next steps, and gotchas; update it when you start or
finish a task.

## What this is

Monorepo for BRH Intelligence: a French-language RAG platform over BRH (Haiti's
central bank) documents — a LangGraph agent, a FastMCP server, and a Next.js
app, all sharing one Python core.

**Much of it is a scaffold.** A module existing in the tree does not mean it
works. These still `raise NotImplementedError`:

- `brh_core`: the optional `embeddings/openai.py` adapter remains a scaffold;
  production uses Pinecone integrated embeddings, so it is outside that path.

Implemented today: `brh_core.{config,models}`, `brh_core.db.{pool,migrate}`,
`brh_core.inventory.*`, `brh_core.ingestion.{ocr,engines,markdown}` (the batch
OCR stage: manifest → ledger → page-marked markdown),
`brh_core.ingestion.{discover,metadata,extract,pipeline}`, the transactional
`brh_core.db.repository`, and `brh_core.catalog` (discovery → PaddleOCR artifact
validation → page/chunk persistence; vector indexing remains opt-in),
`brh_core.ingestion.chunking` (structure-aware hybrid chunking v2, ADR-0011) with
`chunk.py` as its stable facade, `brh_agent` (bounded adaptive research,
chat/decision clients, validated answer publication and configurable Arize
tracing; ADR-0017/0018/0022), and the
`brh_analytics` design layer plus its `inventory` family.

Ingestion/indexing is now runnable end to end: LangChain discovery/ingestion
cycles, exact E5 token counts, Pinecone hosted Records API, durable Postgres
index manifests, restart-safe reconciliation and canonical `RetrievalService`.
See ADR-0012 and `docs/architecture/ingestion-operations.md`. Agent generation is
implemented; live model verification needs `OPENROUTER_API_KEY`. MCP tool
registration remains separate surface work.

## Layout and boundaries

- `packages/core` (`brh_core`) — domain model, storage, ingestion, retrieval;
  the single shared core that both services depend on.
- `services/agent` (`brh_agent`) — LangGraph graph. `services/mcp` (`brh_mcp`)
  — FastMCP server. `apps/web` — Next.js, talks to the agent via the LangGraph SDK.
- `services/analytics` (`brh_analytics`) — stats, charts and social-media
  assets, grouped into *families* (one package per kind of analytics; the
  `inventory` family is live). Take colours from `palette.py` and rules from its
  `DESIGN.md`; never hardcode a hex. The `analytics` agent
  (`.opencode/agents/analytics.md`) owns changes there — delegate to it rather
  than re-deriving the house style.
- `experiments/` — a **standalone uv project** (own `.venv` + lockfile), *not* a
  workspace member. **Experiments are notebooks, not code** — see
  [Experiments](#experiments-are-not-code) below. Nothing in `experiments/` is
  imported, packaged or shipped.
- `docs/` — `adr/` (why), `architecture/` (as-is), `plans/` (pre-work).
- `data/` — gitignored, except `data/ocr/` which is committed so an experiment
  can be re-derived from a clone. `data/raw/web/<sha256>.pdf` is the
  content-addressed store the inventory writes.

Two separate workspaces: the root `pyproject.toml` is a uv virtual workspace
(`packages/*`, `services/*`); the root `package.json` is a bun workspace
(`apps/*`).

## Experiments are not code

`experiments/` answers one question per notebook and then stops. It is **not a
prototype tree**, and nothing in it ships.

The loop is: **notebook → sign-off → ADR → eval/test → implementation.**

1. A notebook in `experiments/notebooks/` (`NNNN-topic.ipynb`) states one
   question, fixes its decision rule *before* the run, and ends with the answer
   and its trade-off.
2. Artifacts live beside it (`experiments/<topic>/results.json`, `REPORT.md`)
   and are committed, so the numbers re-derive without re-running.
3. Results are a **recommendation**. No `brh_core` module, no `Settings`
   default and no ADR changes until a human signs off. A notebook must not
   leave the scaffold half-edited behind it.
4. Only after sign-off: the ADR, then a test that encodes the choice, then the
   implementation written against that test.

The boundary that makes this real:

- **Nothing in `experiments/` is importable by shipped code.** No
  `brh_core`/`brh_agent`/`brh_mcp`/`brh_analytics` module may import from it,
  and `experiments/` is not a workspace member. If a notebook function is worth
  keeping, it is re-written in `packages/` behind a test — not copied over.
- **A `.py` under `experiments/` is the experiment, never the product.** It is
  allowed only as the notebook's driver or as the scoring/glue for a run that
  happened elsewhere (`experiments/mineru/score.py`). It does not grow a public
  API, and `packages/` never depends on it.
- **Seeded and offline by default.** `random.Random(seed)`, no key, no network.
  A run that needs a model or a GPU says so and records what it skipped.
- **Several seeds, spread reported.** One seed can crown a fragile winner.
- **Report the metrics that punish your own candidate.** Recall alone once
  picked a chunker that cut 76 % of its seams mid-word.
- **Never edit a result to match a doc.** Regenerate, or mark the doc stale.

## Commands

Run from the repo root with `uv run` / `bun` — the uv workspace is what resolves
`brh-core` for the services.

```bash
make help                          # list all targets
make install                       # uv sync --all-packages + bun install
make postgres-up                   # docker compose, container brh-postgres :5432
make migrate                       # python -m brh_core.db.migrate
make inventory ARGS="--limit 20"   # catalogue brh.ht + download (needs Postgres)
make inventory ARGS="--sample 90"  # spread across publication years, not the oldest
make test                          # uv run pytest
make lint                          # ruff check . + web tsc --noEmit
make check                         # lint + test
make lab                           # JupyterLab for experiments/
```

- Single test: `uv run pytest packages/core/tests/test_inventory.py -k catalogue`.
- pytest runs `packages/core/tests` + `services/agent/tests` (root `testpaths`).
- `apps/web` has **no ESLint** — its `lint` and `typecheck` are both
  `tsc --noEmit`. `apps/web/package.json` is the source of truth.
- Ruff excludes `experiments/` (notebook cells trip it).

## Browser verification

Use the `agent-browser` CLI for preview checks, screenshots and interaction —
it is the preferred browser harness in this repo. Start the app (`bun dev` from
`apps/web`), then:

```bash
agent-browser --args "--no-sandbox" open http://localhost:3000
agent-browser set viewport 1440 1200
agent-browser screenshot --full /tmp/opencode/<name>.png
agent-browser errors
agent-browser close
```

`--no-sandbox` is required in this container. For a static HTML mock, open
`file:///...` with `--args "--no-sandbox,--allow-file-access-from-files"`.
Do not fall back to raw Chrome headless flags unless the CLI cannot do the job.

## Gotchas that cost time

- **`langgraph dev` overrides shell env.** `services/agent/langgraph.json` sets
  `"env": "../../.env"`, which wins over exported variables — edit `.env`, not
  the shell, to change what the agent sees.
- **`.env` is discovered by walking up from the CWD**
  (`brh_core.config._discover_env_file`), so the repo-root file is found from any
  member. `get_settings()` is process-cached; pass `refresh=True` to reload.
- **Tests run offline** — no Postgres, no Pinecone, no network. Use the `memory`
  vector backend + `hashing` embeddings, and duck-typed fakes instead of a DB.
  Mark anything needing real services `@pytest.mark.integration`; the marker is
  declared but *not* deselected by default, so filter with `-m "not integration"`.
- **Migrations are append-only and idempotent**: add `NNNN_*.sql` under
  `brh_core/db/migrations/`, applied by `brh_core.db.migrate` and tracked in
  `corpus.schema_migrations`. Never edit an applied migration.
- **`brh.ht` is WordPress.** Enumerate documents with
  `wp-json/wp/v2/media?mime_type=application/pdf` — `media_type=application/pdf`
  returns HTTP 400. File responses carry `Last-Modified`/`Content-Length` but
  **no `ETag`**, and the same bytes appear at more than one URL — a URL is not an
  identity; `sha256` is.
- **The sibling `../brh-intelligence-queryengine`** is the seed corpus and prior
  art (`make seed`, override with `BRH_SIBLING=`). Its parsed Markdown has **no
  page markers**, so page-level citations must come from re-extracting the PDFs
  (PyMuPDF, ADR-0005). Its web-ingestion notes are also stale/wrong on the API.
- `data/processed/catalog.json` and the sibling Markdown under `data/` are
  leftovers from an earlier run, not sources of truth.
- **Runners are caches, not storage.** A Colab runtime is reclaimed after about
  an hour; a Kaggle kernel's output disappears when the next version is pushed;
  a Modal volume outlives the credit that paid for it but is not a backup.
  `scripts/colab-pull.sh` and `scripts/kaggle-pull.sh` merge **and commit**, and
  `make ocr-pull` does the same for the volume. Extracted work must never exist
  only on a runner.

## UI libraries (binding)

Use maintained libraries for UI and charts. Do **not** hand-roll dialogs,
dropdowns, sheets, tooltips, or chart geometry.

### Charts

Pick the library by task, not by habit:

- **visx** (`@visx/xychart`, `@visx/shape`, `@visx/scale`, `@visx/axis`,
  `@visx/grid`, `@visx/responsive`, `@visx/tooltip`) — default for
  brand-critical, low/medium-density charts where the BRH look matters: line,
  multi-line, area, bar, pie/donut, custom annotations. `XYChart` covers
  animated series + axes + grid + tooltip; `ParentSize`/`ScaleSVG` cover
  responsiveness. Keep to six series.
- **Apache ECharts** (`echarts` + a thin React wrapper) — when the task needs
  many chart types from one schema, dense/large tables, zoom/brush, maps,
  heatmaps, or canvas performance. Build one option object from the table
  schema; do not import the world per chart.

Rule of thumb: **≤ 6 series and brand-critical → visx**. **Many types, dense
data, or advanced interaction → ECharts**. Both must use the tokens in
`app/globals.css`, keep charts on `surface`, omit gradients on the data, and
carry a provenance line.

The assistant chart renderer is **ECharts** because it renders many chart types
from one table schema. Do not reintroduce hand-rolled SVG chart paths. For
relationship graphs, use the **ECharts `graph` series** for the network view and
**Mermaid** for the hierarchical diagram view; switch them with shadcn `Tabs`.
Detect trees from the edge table (`lib/chat/graph.ts`) to choose the default
diagram and its orientation, and fall back to the network view for DAGs, cycles
or multiple roots. Long trees default to a vertical (`TD`) Mermaid diagram with
a vertical/horizontal toggle. Mermaid is
lazy-loaded (`import("mermaid")`) so the diagram renderer stays out of the
initial bundle. Artifact focus mode is a shadcn `Dialog` opened from the
`ExpandableVisualization` button; do not hand-roll a modal.

Always use Context7 before adopting an unfamiliar API:
`/airbnb/visx`, `/apache/echarts-website`, `/apache/echarts-handbook`,
`/mermaid-js/mermaid`.

### Typography

- **Inter** for UI text, controls, captions and chart labels.
- **Montserrat** for display headings and short eyebrows.
- **Source Serif 4** for long-form reading: assistant answers, document
  artifacts, blockquotes and source excerpts. Use the `font-reading` utility;
  do not set long prose in Inter. Reading text is 15–16px with line-height
  around 1.7.

### Components

Use **shadcn/ui**. `apps/web/components.json` is configured for the
`new-york` style, Tailwind v4 (`app/globals.css`), RSC, and lucide icons.

```bash
bunx shadcn@latest add button dialog sheet dropdown-menu tooltip input textarea
```

- Install/update primitives with the CLI; do not hand-roll a parallel dialog,
  sheet, popover, or dropdown.
- Compose shadcn primitives; keep BRH wrappers/tokens for brand surfaces.
- Use `Sheet` for mobile conversation/source rails, `Dialog` for confirmations,
  `Tooltip` for icon-only actions, and `DropdownMenu` for compact menus.
- Use `lucide-react` for icons (the configured shadcn icon library).
- Query Context7 `/shadcn-ui/ui` before setup, registries, or component APIs.
- Keep colour semantic: **navy** for primary actions and structure, **azure**
  for links/focus, **gold** for provenance only (source badges, citation
  highlights, source rail). Gold is a fill; pair it with navy text. Use
  `gold-ink` for small labels/lines, never raw gold text on white.

## Conventions that differ from defaults

- Domain models are **frozen** pydantic — construct new instances, don't mutate.
- Surfaces (agent, MCP) must go through `RetrievalService`; never touch
  Pinecone/Postgres read paths directly (ADR-0006).
- The web app uses `@langchain/langgraph-sdk` `useStream`, not the AI SDK
  (ADR-0008). The corpus is **French-only**, no auto-translation (ADR-0004).
- Non-trivial decisions get an ADR in `docs/adr/`.
- `BRH_LLM_MAX_TOKENS` defaults to 2048 on purpose (thinking-token budget).
