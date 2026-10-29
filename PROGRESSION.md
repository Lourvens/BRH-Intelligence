# Progression

Last updated: 2026-10-29 (Arize content capture verified; agent/UI commit prepared)

Working state of BRH Intelligence. **Read at session start.** Update when you
start, finish, or pivot a task, and when a non-obvious learning surfaces.

## Active

- **Arize content capture fixed and verified (2026-10-29).** The prior
  `REDACTED` values were the intentional ADR-0018 policy, not failed delivery.
  User-authorized ADR-0022 adds `BRH_TRACE_CONTENT` with a false template default
  and true only in ignored local `.env`. Explicit OpenInference configuration
  now exposes messages, inputs, outputs and source context when enabled while
  hiding invocation parameters, tools, images and embeddings. Jev spans now
  use the active LangChain parent and include decision input/output under the
  same policy. Restarted Agent Server on local port 2024. Arize read-back
  of trace `874e933fe59b1e8e840326e82bd9022b` confirmed ten spans, visible
  chat inputs/outputs and message fields, two linked Jev spans with visible
  decision inputs/outputs, and no configured secret values. Historical traces
  remain redacted. Validation: 369 offline tests pass, 13 integration tests
  deselected. Preparing only agent/UI/config/eval/docs changes for the requested
  commit; unrelated artifacts, experiments and local tooling remain unstaged.

- **Streaming assistant activity UI implemented (2026-10-29).** Exa and
  Context7 research informed a shadcn Task/Trace-style temporary activity panel
  (ADR-0021), composed from existing Button/Collapsible primitives without new
  dependencies or a second chat runtime. LangGraph `get_stream_writer()` emits
  turn-scoped start/end events for model stages and parallel retrieval. Public
  events contain actual goals, queries, passage counts, bounded source previews
  and coverage summaries; no model drafts or private reasoning. The installed
  LangGraph SDK consumes `values` plus `custom` through `onCustomEvent`. The
  client merges operation IDs, rejects stale turns/replayed starts and ignores
  late events after cancellation. Thread restoration has separate feedback.
  The old generic search/spinner row is removed; activity disappears on final
  publication, with interrupted/error state retained until another action.
  The composer preserves its send/stop button identity and exposes stopping;
  scroll-follow respects user scrolling and motion preferences. Validation:
  61 agent tests, eight frontend tests, TypeScript, Ruff, whitespace and the
  production Next build pass. Live research SSE delivered 17 activity events,
  two parallel searches with six passages each and source previews, then a
  validated answer. A direct installed JavaScript SDK smoke test consumed the
  same event contract and verified greeting -> respond -> publish, without
  fabricated search activity. Browser visual/interaction QA was not run.

- **Agent simplification and memory verified (2026-10-29).** Context7 plus
  primary LangGraph/Anthropic documentation informed ADR-0019/0020. Execution
  nodes decrease from 19 to 12: plan/draft nodes loop for their single repair;
  one response node generates conversation, clarification and limitations.
  Jev selects refine/draft/respond after retrieval and reviews generated replies.
  Hardcoded scope/insufficient/safety refusals were removed; technical error
  fallbacks, deadlines, budgets and canonical citation validation remain.
  All runtime prompt instructions are French; one `AGENT_PROMPT` owns identity,
  goal and rules. LangChain receives one system message, bounded typed history
  and an ephemeral task envelope. `memory.py` uses `trim_messages` with an
  approximate 4,000-token budget over at most six previous messages; full
  thread checkpoints remain owned by Agent Server. No global memory store or
  legacy buffer was added. SDK thread selection/reload already matches the
  documented server contract. Validation: 60 agent tests, Ruff, whitespace and
  12 local evaluation cases pass. Live server tests confirmed same-thread name
  recall, isolation of another thread and a generated scope response. A live
  research run had a valid four-goal plan and zero plan repairs, then generated
  `safe_limitation` after answer-support review rejected both drafts; factual
  answer quality remains unresolved. Local evaluation contract is v4 (three
  calls for greeting plus response review); remote sync/full repeated eval was
  not run. The existing dev server hot-reloaded and remains on port 2024.

- **Planner cardinality prompt fixed and live-verified (2026-10-29).** The
  planning prompt now states the `TaskPlan` invariant explicitly: `direct`
  requires exactly one goal, while `decomposed` requires two to four, and it
  forbids the two invalid combinations. Added a regression assertion for all
  three statements. Validation: all 53 agent tests and targeted Ruff pass;
  `git diff --check` passes. Restarted Agent Server on local port 2024. A live
  multi-topic request produced `mode=decomposed`, four goals,
  `plan_status=valid` and zero plan repairs. Its later `safe_limitation` came
  from downstream answer-support validation, not planning.

- **Live planner failure diagnosed (2026-10-29).** Arize trace
  `3273405d550efdfd57a10bbaa0c40895` proves the chat provider returned
  syntactically valid structured JSON, but the payload selected `mode=direct`
  while containing multiple goals. `TaskPlan` correctly rejected it because
  direct research requires exactly one goal. The initial plan and its single
  repair repeated the same violation, then the bounded graph published
  `safe_limitation` without retrieving. The visible issue text is misleadingly
  generic: `nodes.guarded()` collapses every Pydantic/schema error to
  `Malformed structured model output`, so the repair model is not told the
  actionable invariant it violated. No product code was changed during this
  diagnosis. Recommended fix: give the repair attempt a sanitized structured
  validation reason and state the direct/decomposed cardinality invariants
  explicitly in the planner prompt; retain the strict schema and bounded exit.

- **Arize UI visibility mismatch diagnosed (2026-10-29).** The running Agent
  Server and tunnel remain healthy. A direct authenticated `POST /v2/traces`
  read proves telemetry is stored in private space `lourvens.luxamar Space`
  (`U3BhY2U6NTAyNzY6cjhTNA==`) under the `APPLICATION` project
  `brh-intelligence` (`TW9kZWw6MTA3NzU3MTc1MDI6cFlQTA==`). It returns the
  clean greeting trace `f94082b7b674f7ce2d386c620d85af25` with eight `OK`
  graph spans at 15:37:08–15:37:11 UTC, plus the user's newer research trace
  `3273405d550efdfd57a10bbaa0c40895`. The exporter therefore worked; an empty
  Arize screen means the UI is scoped to another space/project, has a time or
  status filter, or the logged-in user cannot access this private space.

- **Agent Server clean-restarted for live testing (2026-10-29).** Stopped the
  previous `langgraph dev` process and launched a fresh
  `uv run langgraph dev --tunnel --no-browser` instance from `services/agent`.
  Local `/info` is healthy on port 2024 and corpus readiness reports 1,026/1,026
  published documents. A fresh `Hello` request routed through Jev to
  `conversation`, skipped planning/retrieval, used two model calls and returned
  the BRH assistant introduction with zero citations. Arize read-back confirms
  the completed eight-span `agent` trace (`f94082b7b674f7ce2d386c620d85af25`)
  plus its content-redacted `brh.decisions` span; every graph span is `OK`. The
  server and Cloudflare tunnel were intentionally left running for user tests.

- **Jev-first intent routing implemented (2026-10-29).** Removed the hardcoded
  social allowlist and the temporary deterministic `social.py` reply path. Every
  valid message now reaches a typed Jev decision selecting `conversation`,
  `plan` or `out_of_scope`. Conversation skips research planning/retrieval and
  calls the chat model with one general BRH assistant identity instruction;
  substantive and ambiguous requests continue to the structured planner and
  its existing Jev validation. A live English `Hello` run returned
  `route=conversation`, no plan, zero citations and two model calls, with the
  English BRH assistant introduction requested by the user. The first
  chat-planner-first attempt was rejected after it produced invalid structured
  plans for a greeting, which is why routing now uses Jev before planning.
  Validation: targeted Ruff, all 52 agent tests and a live Agent Server greeting
  pass. Arize dataset `brh-agent-behavior-v3` records the new two-call/no-plan
  conversation contract (ID `RGF0YXNldDozNzIyMTM6U043Sg==`).

- **Arize-backed agent behavior evaluation implemented (2026-10-29).** Added
  `services/agent/evals/` with a reviewed 12-case French behavior set covering
  conversation, greeting-plus-research routing, direct research, explicit-date
  preservation, decomposition, clarification, scope and prompt injection. Each
  Arize experiment row runs repeated Agent Server trials; deterministic code
  evaluators independently score the behavior contract, repeated-run stability
  and transport availability, so Jev never judges itself. Context7 supplied the
  current `ArizeClient.datasets.create()` / `client.experiments.run()` and
  `Evaluator` contracts; `arize==8.61.0` is a workspace dev dependency. The
  current immutable `brh-agent-behavior-v3` dataset was created in the configured
  Arize space (ID `RGF0YXNldDozNzIyMTM6U043Sg==`); earlier versions retain the
  superseded routing contracts. `make agent-eval ARGS="validate|sync|run"` is the
  operator entry point; the full repeated live experiment remains opt-in and was
  not launched. Validation: six eval regression tests and all 52 agent tests pass;
  targeted Ruff and whitespace checks pass. The initial set measures graph
  contracts, not factual accuracy; reviewed factual gold answers remain next.

- **Live agent behavior acceptance stopped at the first broken boundary
  (2026-10-29).** The UI-facing Agent Server, web route and corpus were healthy
  (`/info` 200, `/assistant` 200, corpus ready with 1,026/1,026 documents).
  `Salut !` passed the social fast path in 1.99 s with one chat call, no plan,
  retrieval or citations. The first direct BRH research run retrieved two ready
  result sets and assessed support as `supported`, but two decision-model answer
  validations rejected publication and returned `safe_limitation` with no
  citation. An identical focused repeat succeeded end to end, establishing an
  intermittent decision-gate failure rather than a corpus or provider outage.
  The first multi-goal research run also failed after plan validation plus one
  repair, before retrieval. Acceptance was halted before the remaining scenarios
  per the full-story verification rule. Existing mocked workflow/model tests do
  not expose this live-model variance: 38/38 pass. No browser automation and no
  product-code changes were made. Next: add a recorded French live-eval set with
  repeated trials and inspect/calibrate Jev plan/grounding judgments before
  treating the agent as behaviorally ready.

- **Arize orphan-span warning audited (2026-10-28).** Read back every span since
  the Arize project was created using metadata-only API columns. All seven spans
  resolve to an existing parent or are a valid root; pagination is complete and
  there are zero orphan candidates. The live agent trace has a valid `agent`
  root and complete prepare/routing/conversation/publish relationships. The UI
  warning was therefore transient: batched child spans can arrive before the
  still-running root span ends and uploads. No runtime change was needed.

- **Arize agent observability implemented (2026-10-28).** Replaced agent
  runtime LangSmith export with `arize-otel` plus OpenInference LangChain
  instrumentation (ADR-0018), while retaining the LangSmith MCP only as an
  optional historical inspection tool. Resolved the configured account's Arize
  space, stored its ID/token only in ignored `.env`, and created/verified the
  `brh-intelligence` application project. Runtime code enforces redaction of
  inputs, outputs, messages, invocation parameters, tools, prompts, choices,
  embeddings and retrieved documents; Jev spans contain only model name and
  question count. A content-free exporter smoke span flushed successfully, then
  a real greeting produced a six-span LangGraph trace in Arize. Read-back found
  the expected graph/model metadata and redaction markers, with no submitted
  human/assistant text. The Agent Server restarted on port 2024 and logs Arize
  tracing enabled. Validation: 353 offline tests passed (13 integration tests
  deselected), targeted Ruff and whitespace checks passed.

- **LangSmith tracing setup repaired (2026-10-28).** Normalized the root `.env`
  to one modern `LANGSMITH_*` tracing destination and removed the conflicting
  `LANGSMITH_AGENT_ID` / `LANGSMITH_AGENT_ENVIRONMENT` pair that caused the SDK
  to discard implicitly targeted traces. `.env.example`, the deployment runbook
  and agent-runtime guide now use the same contract. The existing LangSmith MCP
  is installed at `https://api.smith.langchain.com/mcp`, enabled and
  OAuth-authenticated; it successfully resolved the `brh-intelligence` project.
  Restarted `langgraph dev --tunnel --no-browser`; the local API returns 200 and
  startup metadata reaches LangSmith with HTTP 204. Added a regression test that
  forbids mixed trace destinations and legacy `LANGCHAIN_*` aliases in the env
  template. Validation: 14 targeted tests, Ruff and whitespace checks passed.

- **Adaptive agent implemented (2026-10-28).** LangGraph now runs the social fast
  route, structured plans, Jev plan checks, bounded `Send` retrieval workers,
  dependency waves, fair canonical evidence merging, coverage, one missing-goal
  refinement and one answer repair before validated publication. Separate Mistral
  chat/Jev typed-decision clients honor configured endpoints, timeouts/retries and
  credentials. Context7 verified graph and stream APIs. The graph and corpus HTTP
  app share lazy resources. The frontend uses real SDK messages, cancellation,
  idempotent retry, session thread metadata, checkpoint reload and claim-local
  citations scoped to the selected answer. ADR-0017 and
  `docs/architecture/agent-runtime.md` document the contracts and limits.
  Validation: 349 offline Python tests (including 43 agent tests; 13 integration
  tests deselected), three web citation/message tests, targeted Ruff, TypeScript
  and production build passed. Local
  Agent Server `/info` and a stateless greeting run returned 200; the run correctly
  published unavailable because `OPENROUTER_API_KEY` is blank. Paid/live model
  quality is unverified. Next: fill the key and restart Agent Server, run reviewed
  French acceptance/evaluation; add server thread ownership/rate limits before
  public multi-user deployment. No browser automation was used.

- **Agent model environment setup (2026-10-28).** Added independent `BRH_CHAT_*`
  and `BRH_DECISION_*` settings, local `.env` entries and `.env.example` defaults:
  OpenRouter Ministral `mistralai/ministral-8b-2512` for chat and Jev
  `typesafe/jev-1.14` for decisions. Chat uses `/api/v1`; Jev uses
  `/api/alpha/decisions` through a separate base URL/path. `OPENROUTER_API_KEY`
  is a blank shared agent credential, separate from the existing embedding key.
  Legacy `BRH_LLM_*` values remain intact. Secret redaction now covers every
  `SecretStr`. Provider clients and agent generation remain unimplemented.
  Jev supports typed judgments, not free-form plans/query rewriting; corrected
  the detailed design to assign text generation to chat and typed gates to Jev.
  Validation: 19 offline config/smoke/path tests and targeted Ruff checks passed;
  no paid provider calls were made.

- **Two agent model roles selected (2026-10-28).** User chose a chat model and
  a decision model. Updated the agent plans: chat handles conversational replies,
  clarification wording, answer drafting and repair; decision handles intent,
  rewriting, planning, refinement, coverage and semantic review. Greeting fast
  routes now call the chat model directly while skipping decision/retrieval.
  Model clients/configuration are separate; code retains budgets, tool execution
  and citation integrity. Provider/model IDs remain open. Planning only.

- **Adaptive agent graph designed (2026-10-28).** Added
  `docs/plans/2026-10-28-agent-graph-design.md`. The proposed LangGraph has one
  coordinator, a high-confidence conversational fast route, structured
  intent/query planning, deterministic plan validation, dynamic bounded
  goal-worker fan-out, idempotent result reduction, semantic coverage assessment,
  missing-goal-only refinement, validated drafting and explicit terminal
  outcomes. `Hi`, `What's up?`, thanks and farewells bypass planning and retrieval;
  greeting-prefixed research does not. Direct questions and decomposed research
  share the same worker path; loops and repairs have hard limits. Clarification
  ends the current turn normally, and only progress plus the final validated
  answer is user-visible. Planning only; ADR-0002 still requires amendment before
  runtime implementation.

- **Agent Phase 1 analyzed (2026-10-28).** Detailed the first live vertical
  slice in `docs/plans/2026-10-28-agent-phase-1-design.md`: structured intent
  detection, semantic-preserving query rewriting, direct or decomposed execution
  based on query complexity, bounded goal workers/refinement, evidence assessment,
  validated drafting, real LangGraph SDK integration and explicit failure
  outcomes. Found material gaps in claim-level citation rendering, per-message
  citation persistence, retrieval-threshold calibration, resource ownership,
  anonymous thread isolation and graph-run rate limiting. Recommends progress
  streaming followed by atomic validated answers; this and thread scope remain
  product decisions. Planning only; no runtime behavior changed.

- **Initial agent design proposed (2026-10-28).** Draft:
  `docs/plans/2026-10-28-agent-design.md`. Proposes one conversational assistant,
  bounded research, conditional numerical analysis, explicit evidence review and
  validated native artifacts. Distinguishes retrieval presence (`grounded` today)
  from semantic support, and separates the execution graph from corpus evidence
  relationships. Product priority (research vs analysis) remains open. Reviewed
  existing code/ADRs and current official LangChain docs. Planning only; no agent
  runtime or approved architecture decisions changed.

- **Assistant cleanup completed (2026-10-28).** Removed seeded example
  conversations, example prompt links and local-demo notices from the header,
  sidebar and loading state. The assistant starts with an empty history and the
  centered composer. Submission still uses the existing canned-response handler;
  live agent integration remains pending the role/design work. TypeScript,
  React review and diff whitespace checks passed. No browser automation used.

- **UI delivery (2026-10-28).** Collected the completed graph workspace and
  centered assistant changes for commit and push to main. Existing artifact,
  extraction-trial, experiment and unrelated architecture edits remain separate.

- **Assistant empty state implemented (2026-10-28).** Centered the welcome title
  and existing composer, with compact example links beneath the textarea.
  One composer instance and identical textarea styling serve empty and active
  conversations; only its position changes. Sources appear with messages.
  TypeScript and whitespace checks passed. The assistant route returned HTTP 200;
  rendered markup contains exactly one textarea, followed by the example links.
  No browser automation was used.

- **Full-view graph workspace implemented (2026-10-27).** The graph fills the
  research viewport with integrated search/results, removable filters, view and
  neighborhood controls, legend, counts and camera/fullscreen tools. Replaced
  the permanent split panel with a contextual desktop inspector; mobile filters
  and evidence use mutually exclusive bottom Sheets. All graph panel scrolling
  uses the existing shadcn ScrollArea. Filters use a CLI-generated shadcn Popover
  contained within the graph. URL-backed selection and filters remain shareable;
  ECharts stays mounted when switching to the accessible list. Added focus
  restoration, Escape handling and reduced-motion panel transitions. No new
  package dependencies were needed. Context7 was unavailable; official shadcn
  and Radix documentation were used for the overlay primitives.
  Validation: production build, final TypeScript, three existing Bun corpus tests
  and diff whitespace checks passed. Local graph page/API returned HTTP 200;
  search returned 90 nodes, a neighborhood returned two nodes/one edge, and its
  evidence endpoint returned a published passage. No browser automation or
  visual inspection was performed, per the user's restriction.
  Design: `docs/plans/2026-10-27-graph-workspace-design.md`; architecture updated.

- **Dependency sync (2026-10-27).** Fixed the missing React Query import after
  pulling main by running `bun install --frozen-lockfile` (578 packages). The
  dependency was already declared; no manifest or lockfile change was needed.
  Web TypeScript passed and local `/brh-corpus` returned HTTP 200.

- **Main pulled locally (2026-10-27).** Fast-forwarded `46b6e03` to `bba74c4`
  from `origin/main` (four commits). Local changes were preserved; the local
  progression update was temporarily stashed and restored without conflicts.
  No dependency installation, migration or runtime restart was performed.

- **Landing interaction refinement (2026-10-27).** Checked available skills (no
  UI/motion skill installed) and researched public Aceternity-author examples
  plus Motion API source. The supplied `ui.aceternity.com/interactions` and
  Motion docs are denied by the environment proxy (403), explicitly unverified.
  Added spring-followed pointer light/hero tilt, a pause control, offscreen
  ambient-motion suspension, collection feedback and a shared tab indicator.
  Fixed the agent preview presence boundary so exit transitions actually play.
  Touch/reduced-motion behaviour stays static; no third-party component copied.
  Research links and behaviour: `docs/architecture/landing-motion.md`.
  Production build/TypeScript and both desktop/mobile browser checks passed,
  including pointer response, pause, reduced motion, tab/keyboard activation,
  320–2560px layouts and absence of browser errors. Fixed a hydration mismatch
  by rendering the preference-dependent pause button only after hydration.
  Registered `@aceternity` in the web components.json, installed shadcn 4.22.1
  as a dev dependency and added project-local Codex MCP configuration. Real
  stdio MCP initialization/tool discovery/registry recognition succeeded;
  Aceternity registry search failed with a cancelled network request. The
  configured MCP does not remove the environment's registry access restriction.
  Direct MCP component retrieval was also attempted (`@aceternity/spotlight`,
  `@aceternity/3d-card`), failing at `registry/spotlight.json` with a cancelled
  request. Frozen-lockfile dependency installation verified successfully.

- **Landing page refined (2026-10-27).** Replaced the technical pipeline/comparison
  narrative with topic entry points, an interactive agent preview, connected
  exploration, source verification and publication collections. Original SVG/PNG
  artwork, Framer Motion entrances/hover/ambient movement and reduced-motion
  support; shadcn/Radix tabs connect examples to real catalogue searches. Agent
  integration is explicitly labelled as planned. Updated navigation/footer/SEO,
  removed fixed coverage dates and unsupported agent guarantees. Aceternity's
  registry was inaccessible; lighting/depth are original, no third-party code
  or new dependency claimed. Production build and TypeScript passed; browser
  checks caught a shared-header overflow at 320px, now compacted for small phones.
  Final production build passed, along with both desktop/mobile browser tests:
  agent tab switching and keyboard activation, real search links, anchor targets,
  no horizontal overflow from 320–2560px, dark mode and reduced motion. Updated
  production preview runs on port 3000. Screenshots: `/tmp/brh-ui/landing-*.png`.

- **Research atlas UI completed (2026-10-26).** Rebuilt Documents, a paginated
  Entities directory, entity profiles, the focused document reader and a dedicated
  whole-corpus Graph workspace. Added responsive navigation, collection filters,
  publication list/grid, citations/figure zoom, exact research return context,
  stable graph type colours, evidence inspectors and reduced-motion behaviour.
  Postgres supplies bounded mention/accepted-assertion projections and paginated
  evidence through the existing Agent Server; migration 0008 adds supporting
  indexes. No separate backend, paid extraction or indexing was introduced.
  Validation: 298 offline Python tests, 10 isolated Postgres acceptance tests,
  3 web unit tests, Ruff, TypeScript and the production build passed. The full
  browser suite passed 12 scenarios with 2 intentional device-specific skips;
  final graph control/sheet viewport bounds were rechecked on desktop and mobile.
  Browser checks cover 320–2560px, dark/reduced-motion preferences, keyboard/focus,
  filter drafts, reader page jumps/return context and a 500-node/1000-edge fixture.
  The cloud instance has 1,026 readable documents but no extracted graph data;
  populated graphs were validated with browser fixtures and disposable databases.
  Web scripts explicitly use the verified Webpack path after Turbopack dev stalled.
  See ADR-0016 and the research-corpus runbook. Screenshots: `/tmp/brh-ui/`.

- **Published document snapshots implemented (2026-10-26).** ADR-0015 replaces
  live-file reads with published Postgres snapshots. Shared data-root resolution,
  immutable local/S3-compatible bundles, atomic promotion, versioned figures,
  Markdown downloads with provenance and readiness are implemented. Migrations
  0006/0007 applied locally; all 1,026 documents published, one blank deferred.
  The previously failing document and web reader respond 200 without the
  unavailable message. Latest isolated SQL acceptance: 7 passed, including
  concurrent snapshot reads, failed promotion rollback, no OCR mount and missing
  asset storage. Validation: 289 offline tests, 7 isolated Postgres acceptance tests and 3 web
  tests pass; TypeScript, Ruff and whitespace checks pass. No browser automation was used.

- **5% graph persistence trial running (2026-10-26).** User authorized paid
  extraction and saving entities using the shared OpenRouter key. Fixed seed 17
  selects 52/1,026 documents (901 pages); manifest, results and resumable driver
  live in `experiments/research-graph/five-percent/` and `trial.py` (notebook 0007).
  Entities/mentions are persisted in Postgres; unreviewed relations stay pending.
  Initial snapshot: 216 pages attempted, 1,015 proposed entities, one failed page;
  the run is ongoing, not a quality benchmark. User spotted dates typed as places:
  temporal validation/prompt v3 now reject them, and 12 existing proposals were
  quarantined with evidence retained by migration 0007. Successful earlier pages
  are retained; resume processes remaining/failed pages. No production model or
  probability thresholds have been approved. Commit/push explicitly requested.
  Follow-up status check: worker alive and advancing; 384/901 pages attempted,
  382 succeeded, two failed (ValueError and ReadTimeout). Published entity view
  contains 1,717 entities / 2,195 mentions across 31 sampled documents; 12 temporal
  proposals remain quarantined. There are 170 pending and 102 rejected relations.
  Counts are a running snapshot, not a completed-run result.

- **Document publication plan completed (2026-10-26), proposed.** See
  `docs/plans/2026-10-26-document-publication-design.md`. Confirmed reader 503s:
  Agent Server launches in `services/agent`; relative OCR paths resolve to the
  nonexistent `services/agent/data/ocr`, yielding `IncompleteOcrArtifact`.
  Catalogue/stats work because they read Postgres. The existing database already
  contains page Markdown, but the reader reopens local artifacts per request.
  Proposed sequence: repair common data-root resolution, serve published pages
  from Postgres, publish versioned figures/bundles to local/durable storage,
  promote snapshots atomically and retain exact evidence provenance. User
  requested planning before further implementation: no runtime repair or
  storage provisioning performed. All checks used HTTP/logs, no browser
  automation; user explicitly prohibited `agent-browser`.

- **Markdown corpus / research graph implementation started (2026-10-25).**
  Implementing the approved researcher-first catalogue, OCR Markdown reader,
  official PDF links, Postgres entity/evidence graph, bounded graph retrieval,
  and separate cheap-LLM + Jev extraction/evaluation workflow. Existing embedding
  backfill and unrelated assistant/experiment changes must remain intact.

- **BRH corpus page plan completed (2026-10-25), pending review.**
  `docs/plans/2026-10-25-brh-corpus-page-design.md` proposes `/brh-corpus`,
  document/page reading, prioritized research features, shared corpus read
  contracts and a phased implementation. Browsing uses Postgres through
  `RetrievalService`; semantic search retains the existing canonical/vector
  boundary. Thin custom HTTP routes in the existing agent deployment are
  proposed, not implemented. Important findings: no catalogue/PDF routes exist;
  landing stats remain hardcoded at 360 documents / 5,592 pages; ingestion
  currently copies WordPress upload dates into `publication_date`; family and
  covered-period metadata need review. The existing offline artifact checker
  passed **991 documents / 14,134 pages / 1,184 figures**. This validates artifact
  structure/assets, not OCR accuracy or live index coverage. Planning only;
  runtime, migrations, workers and experiment results were unchanged.

- **Visualization prominence refined (2026-10-25).** Chart and graph titles /
  descriptions remain visible in a shorter horizontal header; the presentation
  decision is a small collapsed technical-details row, and provenance takes less
  height. Chart canvases grew to 360/420px and graph canvases to 360/380px. A
  follow-up removed redundant separators inside the artifact, leaving its outer
  outline and selected-tab indicators. Graph and chart type/count badges were
  removed from headers to keep attention on their titles and descriptions. Web
  TypeScript check passes.

- **Assistant flat UI redesign completed (2026-10-25).** Separate analysis and
  implementation agents redesigned conversation navigation, the chat header /
  composer, source inspector and generated artifacts with solid surfaces,
  dividers and readable typography. Sources now shares the answer toolbar with
  Copy and Share; sharing includes the answer and citations with clipboard
  fallback. Framer Motion handles disclosure, selection and action feedback,
  respecting reduced motion. Workspace / scroll / feedback hooks and pure chart
  option builders preserve separation of concerns. Charts have data tabs,
  larger plots and adaptive labels. Web TypeScript and whitespace checks pass;
  non-browser smoke checks cover 10 charts, 4 graphs and both diagram
  orientations. The user requested no further browser checks, so the final UI
  has not been visually verified. See
  `docs/plans/2026-10-25-assistant-flat-design.md`.

- **Qwen rebuild implemented; backfill running (2026-10-25).** Implemented the
  approved OpenRouter embedding adapter, 768-token target / 1536-token hybrid
  ceiling, bounded document/request parallelism and resumable derived-data reset.
  OCR artifacts remain the durable input. The old E5 worker is stopped and its
  advisory locks released. Live Qwen → raw Pinecone → canonical citation and
  reset-preserves-extraction acceptance passed in an isolated database/namespace.
  Full exact-token preflight: 931 artifacts / 13,646 pages; 930 readable,
  one blank awaiting text; 47,730 chunks / 32,837,980 Qwen input tokens;
  maximum 1,536 tokens and no cap failures. Snapshot:
  `data/processed/qwen-backfill-snapshot.json`. Derived reset is resumable via
  `data/processed/qwen-reset.json`; sources/pages/inventory are preserved.
  Reset completed for all 899 existing documents: old E5 vectors and canonical
  chunks reached zero, while 899 documents, 13,310 pages and 902 extraction jobs
  remained. The detached `brh-ocr-embedding` supervisor now runs Qwen; its first
  completed cycle verified 20 documents / 731 vectors with no failures. Full
  batches drain without a polling delay; later OCR arrivals are polled every
  30 idle seconds. Blank artifact `790e27b795a384fde070d07c1382a8831afcbe493ac529ad4c5ea0f091f00324`
  awaits readable text. Verification: **252 offline tests passed**, 4 live
  tests deselected; isolated live Qwen/Pinecone/Postgres acceptance passed;
  Ruff and `git diff --check` passed. Each provider microbatch is persisted
  immediately so a later failure reuses earlier remote writes on resume.
  Read-only progress: `uv run python -m brh_core.ingestion.status`; per-cycle
  snapshot: `data/processed/ocr-index-status.json`. Backfill is ongoing, not
  corpus-complete; initial target is 930 readable documents / 47,730 vectors.
  Implementation and tests committed as `6407b3f`; architecture decisions and
  operational documentation are recorded in the companion documentation commit.

- **OpenRouter embedding credential saved (2026-10-25).** Added
  `OPENROUTER_EMBEDDING_API_KEY` to the ignored root `.env` for embedding-only use.
  The production `.env` now selects OpenRouter Qwen, raw Pinecone index
  `brh-intelligence-qwen-1024`, namespace `default`, the pinned official tokenizer,
  768/1536-token target/max, four document tasks and two in-flight embedding
  requests with a one-request/sec initial rate. ADR-0013 records the decision.

- **Historical E5 artifact backfill (stopped 2026-10-25).** `--from-ocr`
  starts directly at completed extraction artifacts, with no local PDF or
  fallback extraction required. All 856 current PaddleOCR artifacts / 12,716
  pages passed completion/page-marker validation. The detached tmux session
  `brh-ocr-embedding` runs `bash scripts/index-ocr.sh`: 20 successful documents
  per cycle, polling every 30 seconds for remaining and newly arrived OCR.
  Logs: `data/processed/ocr-index.log`; single-worker lock:
  `data/processed/ocr-index.lock`. First progress check: 3 successful documents,
  57 verified vectors, one document in progress and no failed manifests.
  LangSmith rejected trace uploads due to its monthly trace quota, so this
  worker disables trace uploads only; Postgres checkpoints/local metrics stay
  enabled. Offline regression: 113 passed, 3 live tests deselected.

- **End-to-end ingestion implemented and live-tested (2026-10-24).** A LangChain
  runnable composes discovery and ingestion. Exact E5 token counts, canonical
  Document projection, hosted Pinecone Records embedding, durable Postgres
  manifests, per-document writer locks, batch reuse/recovery, remote verification,
  database-only reconciliation and shared retrieval/citations are implemented.
  The initially missing `brh-intelligence` index was provisioned with hosted
  `multilingual-e5-large`, `truncate=NONE` and deletion protection; migration
  `0004_index_manifest` was applied locally. An isolated live test passed PDF
  indexing → later OCR replacement → stale-vector deletion → LangChain retrieval
  → page citation, then removed its temporary database and vector IDs. A real
  Postgres restart test also passed. The default namespace has not been bulk
  indexed. See ADR-0012 and `docs/architecture/ingestion-operations.md`.
  Validation: **111 tests passed** with Postgres and Pinecone integration
  suites enabled; the normal offline suite skips those opt-in live tests.

- **Production bugs found by live verification (2026-10-24).** Fixed the
  inventory join (`url AS source_url`, not a nonexistent column), converted
  extraction pages into domain `Page` objects before transactional writes,
  removed Records/Documents API mixing, matched Pinecone SDK 10 keyword
  signatures and `id_`/`score_` serialization, preserved original errors when
  recording failed jobs, and rejected duplicate OCR page markers. These
  were hidden by the earlier permissive fakes; strict SDK contracts and real
  service acceptance tests now cover them.

- **LangSmith chunking evaluation completed (2026-10-24).** Dataset
  `brh-chunking-eval-v2` contains 324 deterministic page-level needle examples
  across three seeds, three length strata and the prose/table/provision content
  families. The `structure-v2, safe-estimate-v2` experiment scored **61.73 %**
  strict needle recall, **79.94 %** windowed recall across chunk boundaries,
  **100 %** page provenance and **100 %** token-cap compliance. The family
  breakdown exposes the next bottleneck: prose 84.26 % strict / 100 % windowed,
  provision 66.67 % / 99.07 %, and tables 34.26 % / 40.74 %. The table score is
  a real preservation problem, not merely a seam penalty; table parsing and
  oversized-row/header fragmentation need the next evaluation pass.

- **Table-aware chunking improvement completed (2026-10-24).** The table path
  now recognises OCR period headers encoded as `<td>`, emits compact semantic
  cell-labelled rows for HTML tables, repeats row labels across oversized
  fragments, carries bounded neighbouring context and following `Source:`
  provenance in the envelope, and evaluates table rows rather than impossible
  whole-table prefixes. The new v3 dataset has 324 examples. The LangSmith
  experiment scored **75.93 %** strict row recall, **89.81 %** windowed recall,
  **100 %** provenance and **100 %** cap compliance. Focused tests: 30 passed.
  LangSmith hit the workspace monthly unique-trace limit while uploading
  evaluator traces, but the aggregate experiment was created successfully.

- **LangChain ingestion completion plan created (2026-10-24).** The architect
  review froze the next dependency order: canonical `Chunk` → LangChain
  `Document`, exact tokenizer, offline hashing embeddings, memory vector store,
  production embeddings, Pinecone adapter, index manifest/reconciliation,
  `RetrievalService`, then LangSmith retrieval evaluation. OCR is explicitly an
  external Kaggle input and is not on this implementation critical path. See
  `docs/plans/2026-10-24-langchain-ingestion-pipeline-design.md`.

- **Offline LangChain indexing path implemented (2026-10-24).** `brh_core` now
  has deterministic hashing embeddings, a filterable/idempotent in-memory
  vector store, backend/embedder factories, and a canonical frozen BRH
  `Chunk` → LangChain `Document` projection. The ingestion boundary captures
  prior chunk IDs, upserts the desired set, deletes stale IDs, and records the
  cleanup count. Tests cover deterministic vectors, stable ranking, metadata
  projection, and fallback→PaddleOCR reindex cleanup. This initial slice has
  since been extended with the durable manifest and verified remote recovery
  described in ADR-0012.

- **Pinecone integrated embedding boundary implemented (2026-10-24).** The
  production adapter follows Pinecone's documented text-record flow: it sends
  `chunk_text` records to the configured namespace, requests hosted semantic
  embedding at search time, and exposes results through a LangChain
  `BaseRetriever`. No client-side production embedding is used. Offline
  contract tests cover payloads, metadata filtering, score parsing and the
  LangChain document boundary. The later live acceptance test passed against
  the provisioned hosted-model index.

- **Incremental extraction resume fixed (2026-10-24).** `run_ingestion()` now
  fingerprints the active extraction source in its content and index keys.
  A document can be processed with the PyMuPDF fallback while its OCR artifact
  is absent; when the PaddleOCR `document.md` arrives or changes, the next run
  re-extracts, re-chunks and atomically replaces the stored pages/chunks instead
  of treating the fallback result as complete. The transition is covered by a
  regression test, and stale vector IDs are now deleted during the same
  reindex. The index-manifest/reconciliation phase is now implemented.


- **Backend/RAG architecture audit completed (2026-10-24).** The intended
  boundaries are good (shared `brh_core`, Postgres metadata, vector-store
  protocol, and one `RetrievalService`). The discovery-to-chunk front-half is
  now executable and covered offline: recursive PDF discovery, SHA-256 and
  UUID5 identity, PaddleOCR-first page-aware extraction with strict page
  validation, PyMuPDF fallback, transactional page/chunk replacement,
  idempotent processing jobs, collision-safe slugs, and atomic catalog export.
  The later implementation closes the vector consistency and retrieval
  scaffolds. Agent nodes/LLM and MCP tools remain separate surface work;
  relevance evaluation and hybrid/reranked retrieval remain quality work.

- **Deterministic hybrid chunking v2 is selected and implemented
  (2026-10-24).** `brh_core.ingestion.chunking` (:mod:`chunk.py` is the facade)
  turns page-marked markdown into four chunk types — `prose`, `table`, `series`,
  `provision` — under a strict 448-token default budget, with a table envelope,
  header repetition, explicit row/header fragments, no row overlap and
  `prev`/`next` links. ADR-0011 records the rules;
  migration `0003_chunk_structure.sql` adds the columns. Full-corpus smoke:
  778 documents → 68 596 chunks in 20.4 s, 0 chunks over the cap, p50 345,
  p95 433 and max 448; 302 pathological rows and 22 oversized headers were
  fragmented; 4 299 chunks span pages and 876 navigation chunks are marked.
  - The historical nine-arm experiment remains unchanged as evidence, but its
    lexical-shift/`semantic-shift-1000` leader is explicitly rejected for
    production because it is not the shipped hybrid algorithm and shares a
    lexical bias with its BM25 evaluation.
  - **Unmeasured**: whether the shipped hybrid retrieves better than the
    alternatives. The next experiment is by content family against
    `multilingual-e5-large`, not BM25.

- **OCR extraction is in progress across three runners (2026-10-20).** The
  catalogue is 1 169 PDFs; **778 are extracted** (66,6 %), 391 remain
  (11 761 pages, 29,7 M characters, 889 figures). The checkout is the whole
  corpus: the Modal volume was pulled with `modal volume get brh-ocr /ocr` and
  merged, so 173 documents that existed only on the volume are now committed.
  Kaggle v10 delivered 80 new documents, v11 79, v12 79, v13 76 and v14 74.
  Versions take 3-5 h on two T4s. Each is pulled and committed by the watcher
  the moment it ends, because Kaggle wipes a version's output when the next is
  pushed. Kaggle's **weekly GPU quota is 30 h** and resets Saturday 00:00 UTC.
  Shards 2/4 and 3/4 are spent (v15 took their last 25); from v16 Kaggle takes
  all four, two per GPU, up to 160 documents per version. **Modal is retired**:
  the skip list is now `scripts/export_skip_list.py`, which reads `data/ocr`.
  - Modal is **stopped by budget**: $25.45 of the $30 credit is spent and the
    spend guard refuses to dispatch below $5. The last run was left to finish;
    no further Modal work is planned without new credit. A volume is not a
    backup: pull it before the credit runs out, not after.
  - Kaggle (`brh-ocr-batch`, two T4s) and Colab carry the rest for free.
    Kaggle does ~78 documents per kernel version; Colab runs 12-document chunks
    with a 3-minute pull loop, and each document gets its own process under a
    40-minute cap (a single hung document stalled two chunks).
  - Skip lists are the union of the volume and the checkout
    (`scripts/modal_ocr.py::export_done`); a document is skipped before
    download when its URL is mapped, after hashing otherwise.
  - **Every pull commits.** `colab-pull.sh` runs inside the cycle every 150 s,
    `kaggle-pull.sh` runs from the watcher, `make ocr-pull` covers the volume.
    Nothing extracted is allowed to exist only on a runner.
  - Cost tracks characters per page (r 0,67), not document length: 22.6 s/page
    on average, 136.8 at the worst. Dense tables dominate.
  - Per-page rates: L4 $0.0019, T4 $0.0019, A100-80GB $0.0083. The PaddlePaddle
    backend measured 4.6x slower than transformers on a T4 and is not used.

- **Citation deep links are implemented** — `brh_core.citations` now builds
  `pdf_url`s (`…/slug.pdf#page=N`), collapses snippets, and assembles citations
  from retrieved chunks; offline tests cover the contract. The assistant source
  inspector and message source list open `pdfUrl` in a new tab and copy it with
  the citation.
- **BRH inventory (front half) is implemented** — `make inventory` catalogues
  every PDF on `brh.ht` (the ledger lists the whole corpus, pending or resolved)
  and downloads the missing ones content-addressed into `data/raw/web/`.
  Idempotent: the download queue is the unresolved rows, so bounded runs advance
  and failures are retried.
- **The rest of the repo is still a scaffold**: structure, contracts, config, and
  wiring only. See the build order in [`README.md`](README.md).
- **A second track, `services/analytics`**, generates the stats, charts and
  social-media assets. Its `inventory` family draws from the crawl ledger (six
  posts); its `corpus` family now draws from the extraction records and the
  per-page profile (eight posts). Both render from `python -m brh_analytics`.
- **A third track, OCR evaluation, is mid-phase 1.** The plan is
  `docs/plans/2026-10-15-ocr-evaluation-design.md`: corpus composition (measured),
  the engine landscape, the three scoring axes (quality / efficiency /
  reliability), and four phases — gold standard dataset → benchmark harness →
  ADR → CI regression gate. Phase 1a (the stratified corpus sample) is **done**,
  and phase 1b has **chosen** its documents — 6 picked by hand from a 22-document
  machine shortlist, 27 pages, in `experiments/gold/documents/`, with
  `build_manifest.py` adopting them and reporting that **5 of the 13 classes are
  uncovered**. Not transcribed yet. No OCR code exists.
- **The web landing page uses the new Stitch hero and sections (2026-10-19).**
  The hero is screen `b961ed14011a4dddb1cb2a19b9894f1d` (*Landing Page Hero
  Officiel*), and the sections below it are screen
  `027bffa8af21414d94f24317e0b8e889` (*Landing Page Complète Officielle*):
  four-step pipeline, corpus narrative + metrics + families + archive image,
  four use cases, sourced-search comparison, FAQ, access CTA and institutional
  footer. The navbar points at the new `#pipeline`, `#corpus`, `#usages`,
  `#comparatif` and `#faq` anchors. Components live in `components/home/*` and
  `components/home/hero/*`; the largest TS/TSX file is
  `assistant-shell.tsx` at 215 lines. The hero `Rejouer` and citation-copy
  controls are interactive. All live-index, guaranteed-accuracy, certification,
  40-year, confidence, latency and vault-style claims were replaced with the real
  1 169 PDFs / 34 transcribed documents / 1 192 profiled pages and the inflation
  note (28,3 %, p. 3).

- **The assistant shell is implemented at `/assistant` (2026-10-19).** Full
  three-panel workspace rebuilt from Stitch screen
  `81afab0033054e6d9c1f58636ea87fb8`: conversation rail, chat with empty state /
  composer / refusals, and a source rail. Assistant messages support inline
  numbered citations, source detail/copy, and generated **chart** and **graph**
  artifacts. Artifacts are schema-driven: `TableArtifact` + `UIDecision` select
  table, chart type (`line`, multi-line, `bar`, `area`, `pie`, `donut`,
  `scatter`) or graph; charts/graphs are derived from rows, and invalid decisions
  fall back to a semantic table. A collapsible decision card exposes the JSON
  decision. It currently runs on clearly marked local demo transcripts in
  `lib/chat/*`; `lib/agent.ts` wraps the real LangGraph `useStream` SDK and is the
  swap-in point for live messages/threads. `lib/chat/open-intelligent-ui.ts`
  records the hybrid A2UI/Open Generative UI routing contract; the CopilotKit
  runtime is not enabled yet. Auto-scroll pauses when the reader scrolls up. The
  landing header and closing CTA open `/assistant`.
  - The workspace now uses the shadcn `Sidebar` dashboard shell and `Sheet` for
    mobile sources. The left rail collapses to an icon rail; the right source
    inspector collapses to a 48px vertical rail (⌘/Ctrl+J). Charts and graphs
    open a shadcn `Dialog` focus mode from an **Agrandir** button. Charts are
    ECharts; graph artifacts detect trees (`lib/chat/graph.ts`), default trees to
    a Mermaid **Diagramme** and non-trees to **Réseau** (ECharts force graph).
    Long diagrams default to vertical (`TD`) with a vertical/horizontal toggle.
    A complex 8-node tree demo
    lives in `lib/chat/tree-artifact.ts` + `tree-demo.ts`; a true 8-node network
    with cycles lives in `lib/chat/network-artifact.ts`. The
    `showcase-multimessage` thread is a single conversation with area,
    multi-line, donut, bar, tree and network artifacts. Long-form answers use
    Source Serif 4 (`font-reading`), while UI text stays Inter and display
    headings stay Montserrat. The long-form demo `lib/chat/long-document.ts`
    exercises headings, paragraphs, quotes, lists, a table and citations.

## Next up

1. Run the corpus backfill incrementally with `make ingest ARGS="--index --limit 20"`;
   add `--watch 60` to consume later OCR artifacts. Discovery is opt-in with
   `--discover --download-limit 20`. Reconcile with `--index --reconcile`.
2. Measure hosted-model retrieval by family using a reviewed LangSmith dataset.
   Connectivity and recovery acceptance tests are not relevance scores. Compare
   350/448-token budgets and table-row/continuation recall.
3. Wire agent generation and MCP tools through the now-implemented
   `RetrievalService`; then connect the frontend to those surfaces.

## Recently done

- **2026-10-24 — Pipeline commits grouped by dependency.** Extraction/chunk
  persistence and resumable hosted indexing/retrieval are committed separately;
  ADRs and the operations guide accompany the implementation. Unrelated
  experiment deletions and local tool configuration remain outside these groups.

- **2026-10-23 — The "experiments are not code" rule, and notebook 0004.**
  `AGENTS.md` now has an *Experiments are not code* section and
  `experiments/README.md` says the same in one paragraph: the loop is
  notebook → sign-off → ADR → eval/test → implementation; results are
  recommendations; nothing in `experiments/` is importable by shipped code. The
  rule came out of this session: a chunking benchmark was first written as three
  `.py` modules plus an "Accepted" ADR *before any decision existed*. Both were
  withdrawn at the time — the ADR stayed deleted until a strategy was actually
  chosen and built, and the run now lives in
  `experiments/notebooks/0004-chunking-strategies.ipynb`, which re-derives
  `chunking/results.json` offline in ~5 minutes.
  - `experiments/pyproject.toml` gains `langchain-text-splitters` for the
    notebook; the workspace runtime is untouched.
  - `.env` now carries a live `BRH_PINECONE_API_KEY` (gitignored; verified
    absent from tracked files). Index `brh-intelligence`, namespace `default`,
    backend `pinecone_integrated`.

- **2026-10-20 — Corpus analytics family (`brh_analytics.corpus`).** The first
  stats over what OCR actually produced, not what the site lists. Sources:
  `data/ocr/<sha256>/meta.json` (182 documents, 2 215 pages, 5,6 M characters,
  160 figures, 13 h 53 of compute), `experiments/gold/page-profiles.json` (the
  116-document, 1 192-page per-page sample) and `corpus.crawl_urls` for coverage
  only. Eight findings: `couverture` (182/1 169 = 15,6 %), `reste` (1 053
  undownloaded, 480 from 2018), `volume` (seven 67-page documents hold 21,2 % of
  pages), `rythme` (22,6 s/page, p90 56,9, max 136,8), `queue` (11 documents
  >20 min, slowest 32 min 20 s), and three sample posts — `pages` (336 scanned
  pages, 28,2 %), `hybride` (20 mixed documents hiding 94 scanned pages) and
  `tableaux` (217 pages with tables, none scanned).
  - Measured, not estimated: the mean is **22,6 s/page** (not the earlier
    8,7 s/page figure), and the cost correlates with characters per page
    (r≈0,67), not document length. `pages` is the first chart to label a share
    per year, via a new `formatter` hook on `charts.per_year`; `charts.histogram`
    is the new distribution primitive. Neither adds a colour.
  - The 182 is local and verifiable: `state.jsonl` replays to the same set once
    duplicate `done` events are collapsed (201 events → 182 shas). Remote volume
    documents are not counted. The catalogue records only 116 downloads because
    the OCR batches fetch PDFs outside the inventory; the `couverture` caption
    says so rather than pretending the two agree.
  - Postgres is optional here: a failed catalogue read warns and drops only the
    two coverage posts. `tests/test_corpus.py` (22 offline cases) and
    `tests/test_formatting.py` (4) pass with no services.

- **2026-10-20 — Assistant libraries: ECharts, shadcn dashboard, Mermaid graphs,
  reading typography.** Migrated the chart renderer from hand-rolled SVG to
  ECharts (line, multi-line, area, bar, pie, donut, scatter) and removed
  `cartesian-chart.tsx` / `pie-artifact.tsx`. Rebuilt the assistant shell around
  shadcn `Sidebar`/`SidebarInset` and `Sheet`, and moved buttons, tabs, cards,
  inputs, badges and tooltips to shadcn primitives. Graph artifacts now render
  two views: a draggable/zoomable ECharts `graph` network and a lazy-loaded
  Mermaid flowchart, using the same table-derived nodes/edges. Added a long-form
  demo document (`lib/chat/long-document.ts`) with headings, paragraphs,
  blockquotes, lists, a table, links and citations, and a real Markdown renderer
  (`react-markdown` + GFM). Long-form reading now uses self-hosted **Source
  Serif 4** (`font-reading`); Inter remains the UI face and Montserrat the
  display face. Collapsible rails were explored in Stitch screen
  `1dcc653cdff9474297b37ef2d5d12c99`, and focus-mode UI was explored in the
  same project. The network view uses free circular nodes in a force layout,
  while the diagram view uses Mermaid boxes and can switch between vertical and
  horizontal orientation. A multi-message showcase thread covers area,
  multi-line, donut, bar, tree and network artifacts. `bun run typecheck` and
  `bun run build` pass.
- **2026-10-19 — Assistant workspace rebuilt from Stitch.** Generated screen
  `81afab0033054e6d9c1f58636ea87fb8` (*Assistant Documentaire Chat Workspace*)
  and rebuilt `/assistant` against it: 280px conversation rail, 56px contextual
  header, 320px source inspector, long-form answer with inline citation,
  multi-line chart with peak callout, source provenance, collapsed JSON decision
  card, and responsive drawers. The answer copy was expanded to three factual
  BIC sequences. Replaced the Stitch copy’s “certified/statutaire/confidence”
  claims with “Réponse sourcée” and no confidence score. Added a mock chart
  gallery (area/pie/bar), multi-line BIC consultations, donut agencies, and the
  existing graph/table/line examples. Chart renderer now supports line,
  multi-series line, bar, area, pie, donut and scatter from table schemas.
  `bun run typecheck` and `bun run build` pass; desktop 1440 and mobile 390
  checked with `agent-browser`.

- **2026-10-19 — Assistant chat UI created at `/assistant`.** Full app shell:
  conversation history rail, chat panel with empty state, suggestions, composer,
  stop state and refusal card; source rail with citation detail/copy; mobile
  drawers. Assistant messages support inline source markers plus generated
  **chart** and **graph** artifacts. Artifacts use a table schema + JSON
  `UIDecision` contract (`lib/chat/decision.ts`): the decision chooses table,
  chart type (line, multi-line, bar, area, pie, donut, scatter) or graph;
  charts/graphs derive from rows, and invalid decisions fall back to a table.
  Added a demo gallery thread covering area, pie and bar next to the line,
  multi-line and donut examples. Added the hybrid Open Intelligent UI routing
  contract (`lib/chat/open-intelligent-ui.ts`): table → A2UI, chart/graph → Open
  Generative UI, disabled by default. The page runs on local demo transcripts in
  `lib/chat/*` (clearly marked “Démo”); `lib/agent.ts` wraps the LangGraph
  `useStream` hook. Landing header and closing CTA link to the new page. Added
  design notes in `docs/plans/2026-10-19-agent-chat-ui-design.md`. Every TS/TSX
  file stays under 250 lines (`assistant-shell.tsx` is largest at 215).
  `bun run typecheck` and `bun run build` pass; 1440px and 390px checked with
  `agent-browser`, including chart/graph artifacts and source drawers.

- **2026-10-19 — Rest sections rebuilt from Stitch.** Replaced the previous
  corpus/questions/method/limits/CTA/footer stack with screen
  `027bffa8af21414d94f24317e0b8e889` (project `14932998564978548471`): four-step
  pipeline, corpus narrative + real metrics + three document families + archive
  image, four professional use cases, a sourced-search comparison table (with a
  mobile card fallback), four-item FAQ, access CTA and a five-column footer. The
  navbar now points at `#pipeline`, `#corpus`, `#usages`, `#comparatif` and
  `#faq`. Removed Stitch’s unfounded precision, certification, legal-value,
  40-year, 24/7, live-index, confidence/latency, integrity and fake institutional
  endorsement claims; the copy uses 1 169 PDFs, 34 transcribed documents, 1 192
  profiled pages and the 2018—2026 sample. Deleted the superseded
  chart/questions/method/limits components. `bun run typecheck` and
  `bun run build` pass; 1440px and 390px layouts plus the mobile comparison
  cards checked with `agent-browser`.

- **2026-10-19 — New Stitch hero implemented.** Replaced the previous hero with
  screen `b961ed14011a4dddb1cb2a19b9894f1d` (*Landing Page Hero Officiel*,
  project `14932998564978548471`). The new hero has the large gradient headline,
  corpus CTAs, a browser-framed product showcase (query bar, three grounding
  steps, sourced answer + document inspector), archive strip, corpus trust tags
  and three real metrics. Replaced the Stitch copy’s live/guaranteed claims with
  the inflation note (`28,3 %`, p. 3), 1 169 PDFs, 34 transcribed documents and
  1 192 profiled pages; removed the reference’s unfounded trust badges,
  confidence/latency figures, the 40-year claim and fake institutional
  endorsements. Added `Rejouer` and citation-copy interactions. Removed the
  now-unused vault image. Largest TS/TSX file: `hero-showcase.tsx` at 180 lines.
  `bun run typecheck` and `bun run build` pass; 1440px and 390px layouts checked
  with `agent-browser`.

- **2026-10-19 — Stitch landing page completed.** Implemented the remaining
  sections of screen `296a96a976eb48cdb85d9cc1277275c0` (project
  `14932998564978548471`): corpus archive + inflation SVG chart + sourced
  excerpt + taxonomy + metrics; four example questions; dark method section with
  retrieval/refusal diagram and architecture notes; explicit perimeter; closing
  CTA; navy footer. Added `public/brh-corpus-archive.jpg`, shared
  `lib/content/navigation.ts` and `components/home/section-heading.tsx`.
  Corrected Stitch overclaims again: “exhaustive/indexed”, “certified”,
  “guaranteed accuracy”, confidence/latency figures and fake retrieval scores are
  gone; the page uses 1 169 PDFs, 34 transcribed documents, 1 192 profiled pages
  and the real 2018—2026 sample. Every TS/TSX file stays under 250 lines.
  `bun run typecheck` and `bun run build` pass; desktop anchor navigation and
  390px layouts checked in `agent-browser` (including the chart labels and mobile
  stacking).

- **2026-10-19 — Stitch navbar + hero implemented.** Started from the blank
  canvas and rebuilt the top of the page from screen
  `296a96a976eb48cdb85d9cc1277275c0` (project `14932998564978548471`). The
  sticky navbar uses the real BRH logo and the reference’s status/CTA layout.
  The hero mirrors the Stitch HTML: centred badge and headline, filter/search
  card, 5/7 split with a locally hosted archive image and a dark agent console,
  then the four trust cards. Real corpus content: inflation `28,3 %` (p. 3),
  BRH creation `17 août 1979` (p. 5), BIC `avril 2013` (p. 5), 34 transcribed
  documents and 1 192 profiled pages. Removed the reference’s fabricated
  confidence/latency/perfect-coverage copy. Components split
  under `components/home/hero/*`; every TS/TSX file is under 250 lines.
  `bun run typecheck` and `bun run build` pass; desktop and 390px layouts checked
  with `agent-browser`, including filter, quick-example and CTA interactions.

- **2026-10-19 — Landing page reset to a blank canvas.** The prior
  Stitch/Aceternity implementation was deleted rather than layered over: all
  `components/home`, `components/illustrations`, site chrome (`site-header`,
  `site-footer`, `mobile-nav`, `brand`), landing motion helpers, `lib/content`,
  and the old landing-only UI primitives are gone. `app/page.tsx` is an empty
  `<main>`; `globals.css` keeps the design tokens/fonts/base styles and drops
  the hero-grid utilities. `bun run typecheck` and `bun run build` pass; the
  blank page was checked in `agent-browser`. Next: implement the next Stitch
  reference one section at a time.

- **2026-10-19 — Stitch-led landing redesign, and the file-size split.**
  Stitch project `14932998564978548471` (design system
  `assets/9aec97cf64f84d10aadabea4bce0f6c6`) produced a desktop screen
  (`…/screens/401097e628ce48af966647703191c905`) and a 390px mobile screen
  (`…/screens/8b717e14e701499da428e788e1ccc756`). The React implementation keeps
  the same editorial navy/azure/gold system but adds Aceternity-style
  spotlight/beams, a bento corpus grid, animated counters and a dark pipeline.
  The hero is now `components/home/hero.tsx` plus
  `hero/{agent-console,sourced-answer,source-document,query-presets,hero-trust}`;
  content is split across `lib/content/{hero,corpus,questions,method,closing}.ts`.
  **Every TS/TSX file is under 250 lines** (largest: `interactive-pipeline.tsx`,
  242). Marketing claims were corrected: no “RAG en ligne”, “confiance 99,4 %”,
  “100 % citations vérifiées” or “Tesseract” — the header says
  “Archive 2018—2026”, the metrics use 34 transcribed documents, and the OCR
  visual says PaddleOCR-VL. `bun run typecheck` and `bun run build` pass; desktop
  and mobile checked with `agent-browser`.
- **2026-10-19 — Web design system and welcome page.** `apps/web/app/globals.css`
  is now the web port of the analytics style guide: brand and neutral tokens,
  the `11 · 12 · 14 · 16 · 20 · 24 · 32 · 44 · 64` type scale, card radius and
  shadows. Montserrat and Inter are **self-hosted** (`app/fonts/*.woff2`,
  latin subset) through `next/font/local`, so the build needs no network and
  French accents are covered. `lib/utils.ts` extends `tailwind-merge` with the
  named scale — without it, `text-caption` and `text-white` collide and navy
  buttons lose their label (caught in a headless screenshot, not by `tsc`).
  New primitives: `Brand` (original 251×123 mark, never recoloured),
  `Button`/`ButtonLink` (primary, secondary, ghost, gold-fill), `CitationChip`,
  `SiteHeader`, `SiteFooter`, and `AnswerPreview`. The page itself is
  `app/page.tsx`: hero, corpus band, three-step method, navy CTA, footer.
  The preview cites **RDCCF Vol. V (juin 2026), p. 19 and p. 23** — real
  sections of a document already in `data/processed`. Copy is deliberately
  provisional. `bun run build` passes; desktop (1440) and mobile (390) checked
  with Chrome headless.
- **2026-10-18 — Full-corpus OCR batch started on Kaggle.**
  Corpus profile: **116 documents, 1 192 pages, 127 MiB** — 336 scanned pages
  (28%), 217 with tables, 72 with figures; 72 born-digital / 20 hybrid / 24 fully
  scanned; years 2018–2026. At the measured **14.9 s/page** (T4, charts on) the
  batch is **~4.9 h**.
  Kaggle turned out to be the better host than Colab: **12 h sessions, 29 GB RAM,
  T4 ×2, 30 GPU h/week**, driven headlessly with `kaggle kernels push`
  (CLI 2.2.4, `KGAT_…` token). Private dataset `lourvensluxamar/brh-ocr-code`
  holds `brh_core` + `urls.json`; kernel `lourvensluxamar/brh-ocr-batch`
  installs the OCR stack, downloads the 116 PDFs from brh.ht with `sha256`
  verification, builds the manifest, runs the batch, and zips the output to
  `/kaggle/working`. State lives in `/kaggle/working/ocr/state.jsonl` and is
  saved as kernel output, so a re-push resumes rather than restarts.
- **2026-10-18 — Batch OCR is production code now, not an experiment.**
  `brh_core.ingestion.ocr` (manifest → ledger → per-document output) +
  `brh_core.ingestion.engines` (PaddleOCR-VL behind a `parse()` protocol, heavy
  import deferred) + `brh_core.ingestion.markdown` (markup normaliser).
  **Resumable by construction:** `manifest.jsonl` keys documents by `sha256`;
  `state.jsonl` is append-only (`started`/`done`/`failed`, every event carrying
  batch id and attempt); status is a replay, never a second field that can drift.
  `done` skips, `--retry-failed` retries, `--max-attempts` marks exhausted,
  `--force` redoes. A failed document never leaves a half-written `document.md`
  (staged + atomic replace). Output: `<out>/<sha>/document.md` with
  `<!-- page N -->`, `assets/pNNN/`, `meta.json`. CLI:
  `python -m brh_core.ingestion.ocr {manifest,run,status}`.
  `scripts/colab-ocr.sh` runs the whole thing on a Colab VM: installs the OCR
  stack, puts `brh_core` on `PYTHONPATH` (no Postgres/Pinecone), builds the
  manifest, runs, prints status. **`brh_core/ingestion/__init__` is now lazy** —
  importing the OCR runner used to pull psycopg and psycopg_pool through
  `pipeline`, which defeated "runs anywhere"; verified: zero heavy modules.
  Tests: `packages/core/tests/test_ocr_batch.py`, 10 offline cases against a fake
  engine (skip-done, retry, exhaustion, limit, missing source, atomicity, cleaning).
  Spec: `docs/architecture/ocr-batch.md`.
- **2026-10-18 — PaddleOCR-VL output layout, settled.** The pipeline writes one
  directory per page (`raw/pages/<sha>/pNNN/`) holding `<sha>_N.md` — **N is a
  0-based page index**, so `p001` holds `_0.md`; the directory is the page number
  — plus `imgs/` with the Figure crops named by box. Those `imgs/…` paths are
  relative to the page directory, so they are **dead in the merged document**
  (14 references across the six files). `clean.py` now copies them to
  `clean/assets/<sha>/pNNN/` and rewrites them as `![](assets/…)`: 14 figures,
  0 broken links, 888 kB, and the output directory is self-contained.
  Tables: 5 stay HTML because their rows have different cell counts (no merged
  cells in this set) — padding them would shift values by a column, so only the
  styling is dropped. `--drop-images` is there for a text-only corpus.
- **2026-10-18 — PaddleOCR-VL chosen; clean output and charts.** Two fixes on top
  of the run. **(1) Markup.** PaddleOCR writes HTML tables with a style attribute
  on every cell and `<div style=…>` around captions — `paddleocr/clean.py` turns
  simple tables into GFM pipe tables, strips every attribute from the rest,
  unwraps divs and unescapes entities: **68 948 → 40 452 chars (59%)**, tags
  1 455 → 897. The wide table now looks exactly like LlamaParse's.
  **(2) Charts.** `use_chart_recognition=True` (off by default) reads a chart as
  data: `63b4ca02` p7 returns 20 rows of `Date | Infl_m | Infl_y`. F1 on the chart
  pages rises 0.340 → 0.428 and 0.646 → 0.754; a non-chart page is unchanged
  (0.996). WER rises on chart pages because the recovered series is text the
  text layer never had — chart pages must be scored on series recovery, not WER.
  Cost: +34% time and +60% output on `110b25ca`. Chosen config:
  `PaddleOCRVL(engine="transformers", use_chart_recognition=True)` + `clean.py`.
  Colab reclaimed a VM mid-run once; the chart pass was re-run on the two
  chart-bearing documents only (19 pages, 64 504 chars, 311 s).
- **2026-10-18 — OCR candidate 3: PaddleOCR-VL 0.9B, and a scoring bug worth
  remembering.** `experiments/paddleocr/` holds the run (Colab T4, PaddleOCR 3.7.0,
  `PaddleOCRVL(engine="transformers")` so torch does the work and no Paddle GPU
  wheel is needed): **6/6 documents, 68 948 chars, 401 s** — the slowest, ~15 s/page,
  and the most verbose (HTML tables). Four-way on the 18 born-digital pages:
  **MinerU 0.907 / PaddleOCR-VL 0.906 / Docling 0.895 / LlamaParse 0.885**; F1 ≥
  0.98 is 10 / 10 / **11** / 7; WER ≤ 0.10 is 8 / 8 / **9** / 8. On the scan it
  reads the body cleanly (unlike Docling) but drops the letterhead like MinerU.
  **The bug:** PaddleOCR emits HTML tables with `style='text-align: center;
  word-wrap: break-word;'` on every cell, and `markdown_to_text` does not strip
  tags — every cell's style text entered the word counts, WER hit 4.0 and the
  engine scored 0.660. `compare_ocr.py` now strips tags for *all* engines, which
  is why Docling's numbers moved from 0.890/10/8 to 0.895/11/9. Score the text,
  not the markup.
  Context: PaddleOCR-VL-1.5 is SOTA on OmniDocBench v1.5 (94.5% vs MinerU2.5's
  90.67%), yet here it is level with MinerU — that benchmark is mostly Chinese and
  English and weights formulas/tables, this corpus is French, table-heavy and
  partly scanned.
- **2026-10-18 — OCR candidate 2: Docling 2.140.0, and a correction to MinerU.**
  `experiments/docling/` holds the run (Colab T4, `do_ocr`, tables, EasyOCR
  `lang=["fr"]`): **6/6 documents, 46 268 chars, 71.8 s**, and it keeps page
  breaks via `page_break_placeholder` — MinerU cannot. Three-way on the 18
  born-digital pages (`experiments/compare_ocr.py`): **LlamaParse 0.885 / 7 pages
  ≥0.98, MinerU 0.907 / 10, Docling 0.890 / 10**; WER ≤ 0.10 is 8 each. Docling
  wins nothing structural but matches MinerU on the wide table (1.000 / 0.000)
  and loses on charts (0.351 vs 0.364 vs LlamaParse 0.483).
  **The scan is the split:** on `f2d799b9` Docling drops the letterhead *and*
  mis-reads the body (`déclarntions`, `circulairc`, `trnnsfert`, `Gdes 5,000.9`),
  while MinerU reads it cleanly.
  **Correction:** MinerU *did* capture `CIRCULAIRE No 95-1A` — it types the
  letterhead as `header` and the footer as `footer`, and its **markdown writer
  omits both**, so only `raw/<sha>.json` has them. For page-level citations,
  render from the page tree, not the markdown. Gotcha: Docling 2.x no longer
  bundles EasyOCR (`ImportError` on every file until `pip install easyocr`).
- **2026-10-18 — OCR candidate 1: MinerU 4.0.12, run for real on a Colab T4.**
  `experiments/mineru/` holds the run: **27 pages, 37 503 chars, 138 s**, tier
  `standard` (small models + VLM), `ocr_mode="auto"`, 6/6 documents. Scored the
  same way as the reference: **mean word F1 0.907 vs LlamaParse's 0.885**, pages
  at F1 ≥ 0.98 **10 vs 7**, WER ≤ 0.10 **8 vs 8**. It is *perfect* on the wide
  financial table (`f31dfee9`: 1.000 F1, 0.000 WER) and cleaner on the two-column
  glossary (`110b25ca` p9: 0.997/0.006 vs 0.969/0.065). Charts beat both: 0.364
  vs 0.483 on `63b4ca02` p7, 0.611 vs 0.564 on `110b25ca` p6 — neither is a
  transcription there.
  Two gotchas cost real time, both recorded in the README: **Colab ships Python
  3.13 and vLLM has no wheels for it** (the install "hangs" building from source —
  use a 3.12 venv), and **vLLM spawns its engine core, so entry scripts need
  `if __name__ == "__main__":`** or the child re-runs the parse. Also MinerU
  inlines page images as base64 in the markdown; `run.py` collapses them.
  `mineru/score.py` reproduces the comparison; no API key, no cost.
  Colab was driven headlessly with `google-colab-cli` (`colab new/exec/download/stop`),
  which needs a one-time OAuth code — `OAUTHLIB_RELAX_TOKEN_SCOPE=1` was required
  because the granted scope set omits `cloud-platform`. HF Jobs was tried as a
  fallback and refused a fine-grained token (`403` on the jobs-artifacts bucket).
- **2026-10-17 — OCR candidates: MinerU first (notebook).**
  `experiments/notebooks/0003-mineru-ocr.ipynb` runs **MinerU 4.0** on Colab (T4)
  over the six benchmark PDFs. MinerU 4 renamed everything — no `magic-pdf`, no
  `-b pipeline`, extras are `torch`/`full` — so the notebook uses
  `mineru.parser.parse(path, tier=..., ocr_mode=...)`. Settings: `tier="standard"`
  (small models + VLM), `ocr_mode="auto"` (text layer where present, OCR where
  not). **There is no `fr` language code**: `ch` is the model that covers Latin,
  and `-l/--lang` only applies to the legacy `pipeline` backend, so `standard`
  ignores it and `fr` raises `ValueError`. Inputs are downloaded from brh.ht and
  verified by `sha256` (all six URLs return the exact manifest byte counts), so
  the run needs no upload. Smoke test is `110b25ca` p9 (the two-column glossary)
  before the full run; output is `.md` + `.json` per document plus `results.json`.
  Not yet executed on Colab.
- **2026-10-17 — The reference and the dataset (phase 1b, continued).**
  `experiments/gold/reference/<sha256>.md` holds the reference **per document**
  (not per page), with `<!-- page N -->` markers so citations stay page-level;
  `.txt` is derived from it, so the two cannot disagree. Built by
  `build_reference.py`: **27 pages, 39 323 characters, 390 credits**, tier
  `agentic`, French OCR, and — from the sibling's `llamaparse` skill —
  `specialized_chart_parsing: "agentic"`, which returns a chart as a **data
  table** instead of axis labels, and describes figures.
  **Correction to an earlier claim:** LlamaParse's `text` expansion does merge
  `110b25ca` p9's columns line by line, but its **markdown reads them correctly**
  (`Inflation sous-jacente … les mouvements saisonniers, conjoncturels, et les
  chocs …`). The column failure was our choice of expansion, not its error, and
  the first version of the README blamed the wrong party. Scoring is now word F1
  (content) + **WER** (order) against the PDF text layer: WER, not CER, because
  markdown rewraps lines and promotes headings (TOC page: CER 0.405 vs WER 0.016).
  Tables are excluded from the order score (text layer is column-major, markdown
  row-major) and chart/figure pages are marked `semantic` (1.6–2.4× the word
  count — richer than a transcription). Result: content `verified` 7, `review` 7,
  `semantic` 4, `unverified` 9; order `ok` 4, n/a 23.
  **`experiments/gold/dataset.jsonl`** is now the deliverable: 27 rows, one per
  page, with `source.pdf`+`page`, `reference_md`/`reference_txt`, class, status
  and the exact parse provenance. `build_dataset.py --check` fails if it drifts
  from the reference. `build_reference.py` has `--recheck` (re-score from the
  stored markdown, no credits) and `--force` (re-parse). Needs
  `LLAMA_CLOUD_API_KEY`; `llama-cloud` is an `experiments/` dependency.
- **2026-10-16 — Benchmark document set (phase 1b).** Profiled all **1 192 pages**
  of the corpus sample, then shortlisted **22 whole documents (141 pages)** covering
  every technical class present — `digital`/`scan` × resolution × content
  (`text-only`, `table`, `figure`, `2col`, `cover`), plus `blank`. A human then
  picked **6 documents (27 pages, 4.1 MB)** from that shortlist as the evaluation
  set; `build_manifest.py` verifies each file against its own `sha256` and derives
  the classes it covers. The pick is lean — a third of the shortlist's pages — and
  **misses 5 classes**, which the manifest reports on every run instead of
  filling. Note: adding `1d275de7`, `ee8e0a16` and `a9e44cba`
  (38 pages, 2.5 MB) would close all five.
  **Selection is per document, not per page**: a benchmark entry is a file, and
  page-level selection had hidden that 11 documents are *hybrid*. Learned the hard
  way: size caps must be a pool filter (breadth-first greedy reached 424 pages /
  42 MB) and year coverage must be a goal, not a tie-break (2021 silently fell
  out). Rendering a contact sheet also showed `find_tables()` firing on covers and
  chart grids, and that **no scanned page with a data table exists** in the
  sample. Also corrected the OCR workload: **336 pages have no text layer
  (28.2%)**, not 242.

- **2026-10-15 — OCR evaluation research (phase 0), and the sample that corrected
  it (phase 1a).** The first pass measured the only 27 documents the backfill had
  reached: **78% born-digital / 19% image-only / 4% scan+text**, scans at
  **74–75 dpi**. That sample was biased — the queue orders `wp_modified ASC`, so
  25 of 28 resolved documents were 2018 circulars. `make inventory
  ARGS="--sample 90"` (10 documents per publication year; the selector is
  `pipeline.stratified_sample`) re-measured it over **116 documents / 1 192
  pages**: **75.9% born-digital, 20.7% image-only (242 pages need OCR), 3.4%
  suspect text layer**, scans at a **median 150 dpi, 96% below 300** — but *not*
  uniformly: 18 of the 24 scans sit in **2018 (11) and 2022 (7)**, 2021 and 2025
  have none, and two **2026** documents are scanned too. The 2022 set is a batch
  of `Circulaire 12x-pdf` scans. Also reviewed the engine landscape (OmniDocBench
  v1.7, olmOCR-Bench, a 22-engine four-track study), CPU throughput, licensing,
  and evaluation methodology — including that **ground-truth noise alone sets a
  4–7% CER floor**, which is why half of phase 1 is measuring our own
  transcription disagreement. Plan:
  `docs/plans/2026-10-15-ocr-evaluation-design.md`.
- **2026-10-15 — Analytics scope + BRH design guide.** `services/analytics`
  (`brh_analytics`, a new uv workspace member) opens the stats/charts/social
  track. The palette was sampled from `brh.ht` itself — the site logo is a flat
  `#031A71` navy, headings are Montserrat — then re-tuned where WCAG demanded
  it (gold stays a fill colour; `gold-ink` carries text). `palette.check()` is
  the machine-checkable contract, `python -m brh_analytics` renders
  `assets/palette.png` plus every post, and the rules live in
  `services/analytics/DESIGN.md`.
- **2026-10-15 — the inventory family, and the grouping.** Analytics is
  organised into *families*: a package per kind of analytics owning its source
  and its copy, with a shared, domain-free design layer (`palette`, `charts`,
  `finding`, `posts`) on top. `inventory` is the first — six findings from the
  crawl ledger (1 169 documents; the 2017-2018 migration masquerading as a
  publication spike; what the BRH publishes; the inflation note cadence; the
  job postings hidden in the media library; the 198 titles that arrive damaged)
  rendered to postable PNGs and browsable in a Streamlit dashboard. Output is
  grouped to match: `out/inventory/<slug>-<format>.png`.
- **2026-10-14 — BRH document inventory.** `brh_core.inventory`: discover PDFs
  via the WordPress media API, download into `data/raw/web/<sha256>.pdf`, log
  every URL in `corpus.crawl_urls` (dates + status + hash) with a run history in
  `corpus.crawl_runs`. Each run catalogues the whole site first, so the ledger
  lists every PDF whether or not it has been downloaded. Verified against the
  live site + Postgres; covered offline in
  `packages/core/tests/test_inventory.py`.
- **2026-10-14 — Scaffold.** Monorepo (uv workspace: `brh-core`, `brh-agent`,
  `brh-mcp`; bun workspace: `apps/web`). Real: config, domain model, SQL schema,
  `VectorStore`/`Embedder` protocols, graph wiring, MCP server shell, tooling,
  Make targets, 10 ADRs. Stubbed with `TODO`: all logic.
- **2026-10-14 — A full working implementation exists on the branch
  `reference/full-implementation`.** It was built first, then reduced to this
  scaffold at the author's request. Use it as a reference while implementing,
  or delete the branch (`git branch -D reference/full-implementation`) if you'd
  rather not have it.

## Backlog / out of scope for now

- Haitian Creole + English surfaces (docs are French-only for now).
- Indicator comparison / structured tables as a first-class query type.
- Session persistence + follow-up memory (LangGraph checkpointer on Postgres).
- Auth + rate limiting for the public MCP server.
- Serve source PDFs from object storage instead of through the web app.
- Evaluation harness (French Q/A over RDDCF, recall@k + groundedness).
- Reranker once we have retrieval failures to point at.

## Gotchas

- The sibling corpus (`brh-intelligence-queryengine/data/processed/*.md`) has
  **no page markers** (`pages: null` in its manifest). Do not rely on it for
  page-level citations — extract page-aware text from the PDFs yourself
  (ADR-0005). This is the single most important lesson carried over.
- Page numbers must be **1-based** and match the PDF viewer's `#page=N`.
- `langgraph dev` loads `langgraph.json`'s `env` file, which **overrides**
  exported shell env vars. To test against the offline backend, edit `.env`,
  not the shell.
- Pinecone's **records API** (`upsert_records` / `search_records`) is what
  integrated-inference indexes use; the plain `upsert`/`query` API needs
  client-computed vectors.
- `multilingual-e5-large` has a **512-token** ceiling and truncates silently.
  Chunking defaults to `DEFAULT_MAX_TOKENS = 448`, with a 64-token reserve;
  counts are conservative estimates (`estimate_tokens`: 2.75 chars/token prose,
  1.9 for tables) until the
  production tokenizer replaces it — every cap is in estimated tokens.
- `brh.ht` is WordPress: enumerate documents through
  `wp-json/wp/v2/media?mime_type=application/pdf`, **not** `media_type=...`
  (that rejects `pdf` with HTTP 400 — the sibling project's doc is wrong).
  Incremental discovery is the `modified_after` parameter.
- `brh.ht` file responses carry `Last-Modified` + `Content-Length` but **no
  `ETag`**, so a cheap re-check is `(last_modified, content_length)`; the real
  identity is the `sha256` computed after download. The same bytes appear at
  more than one URL, so a file's URL is not its identity.
- The inventory's download queue is *derived*, not a stored cursor: it is the
  rows whose status is not resolved (`pending`/`failed`, ordered by
  `wp_modified`). So a bounded run advances, a failure is simply still queued,
  and a document that changes is re-queued (its `wp_modified` moves). Each run
  re-catalogues the whole site first, so the ledger always lists every URL.
- The catalogue stores each PDF's `title`, `slug`, `wp_id` and dates before it is
  downloaded. Its declared `filesize` (from `media_details`) is stored too — but
  only when WordPress has one; older attachments return `media_details: {}`, so
  their size stays unknown until the `HEAD` at download time. `--stats` reports
  `outstanding_sized` so the partial `outstanding_bytes` is not mistaken for the
  whole corpus.
- **The backfill consumes the oldest documents first.** The queue orders by
  `wp_modified ASC` (nulls first), so a plain `--limit` describes 2018 and
  nothing else. Use **`make inventory ARGS="--sample N"`** instead when you want
  to know what the corpus *contains*: it takes one document from every
  publication year in turn. This is not a nicety — the first 28-document read of
  the corpus missed that the scans are concentrated in two years.
- **This machine has no GPU** (8 vCPU, 15 GB RAM, no `nvidia-smi`). OCR
  candidates must be scored on CPU, or a GPU acquired deliberately — the whole
  candidate ladder depends on which.
- **Scans are low-resolution and unevenly distributed.** Over 116 documents:
  median **150 dpi**, 25% below 150, 96% below 300 (the literature assumes
  300–400). But they are concentrated — 2018 has 11, 2022 has 7 of the 24, and
  2021/2025 have none — and the 2022 set is a batch of `Circulaire 12x-pdf`
  scans. Two **2026** documents are scanned as well, so this is not a legacy
  problem. Upscaling/deskewing is a real experimental arm, not a detail.
- **Count pages, not documents.** 336 of 1 192 pages have no text layer (28.2%),
  but only 242 of those belong to the 24 wholly-scanned documents: **11 documents
  are hybrid**, carrying scanned pages among digital ones. A per-document verdict
  under-counts the work by a third, and means the ingestion router must decide
  **per page**, not per document.
- **Never trust a text layer you did not produce.** 4 of the 116 documents carry
  both a real text layer and ~full raster coverage — possibly a previous OCR of
  unknown quality. The ingestion router must verify such a layer, not trust it.
