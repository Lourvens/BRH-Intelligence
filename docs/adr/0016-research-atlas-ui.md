# ADR-0016: Responsive research atlas and a bounded global graph

Status: accepted through the research UI implementation request.

## Context

The catalogue mixed search modes, extraction statistics and filters before the
results. Reading on a phone exposed metadata before text. Graph exploration was
limited to an entity profile and a fixed-height local network. The approved
redesign separates finding publications, reading evidence and exploring links.

## Decision

Use a shared research shell with Documents (`/brh-corpus`), Entities
(`/brh-corpus/entities`) and Graph (`/brh-corpus/graph`). Preserve document and
entity-profile URLs and redirect legacy `mode=entities` links. URLs retain search,
filters, pagination and graph focus/selection. Graph list presentation is also
shareable (`display=list`). Reader returns retain the research URL and catalogue
scroll position across page jumps; graph returns use an exact browser navigation
to avoid a cached Next.js route discarding native-history selection parameters. The reader prioritises the published
page, with document actions in a desktop sidebar or a mobile sheet.

Keep the existing Agent Server: `services/agent/langgraph.json` already combines
its LangGraph graph and the Starlette `http.app`. Corpus HTTP handlers call
`RetrievalService`; no new backend service or graph database is introduced.
Normal browsing and graph queries do not execute the agent or request model calls.
Ingestion and extraction remain separate worker commands.

Postgres supplies the global graph through bounded SQL projections and recursive
local traversal. Documents/entities are typed nodes. Document–entity edges aggregate
current mentions; entity relationships require accepted assertions. Both require
current published evidence, and rejected entities are invisible. Identical labels
never merge independent entity IDs. Co-occurrence is not promoted to a relationship.

`GET /corpus/v1/graph` accepts `view=mentions|relations`, `q`, `family`, `year`,
`kind`, `relationship`, `focus=document:<uuid>|entity:<uuid>`, `hops=1|2`,
`orphans`, `node_limit` and `edge_limit`. The response includes typed nodes/edges,
matching and displayed counts and `truncated`. Limits default to 300/600 with hard
ceilings of 500/1000; the phone UI requests 120/240. Search applies to the eligible
corpus before display limits; focus explores an explicitly chosen result.

`GET /corpus/v1/graph/edges/{edge_id}/evidence` returns paginated current passages.
Mention IDs are `mention:<document_uuid>:<entity_uuid>`; assertion IDs are
`assertion:<assertion_uuid>`. IDs must be URL-encoded. Entity listing retains
`items` and adds `total`, `page` and `page_size`. Migration 0008 adds supporting
indexes without changing existing evidence.

Use shadcn/Radix interactions, Framer Motion, ECharts and the existing Mermaid
local-tree view. React Query handles graph request cancellation/cache; resizable
panels supply desktop inspectors. The graph selects nodes before explicit
navigation and offers a keyboard-accessible list. Mobile inspectors use a sheet.
Heavy network code is dynamically imported. Webpack is selected explicitly in the
web development/build scripts: the default Turbopack development process stalled
during cloud verification; the supported Webpack path completed builds and requests. SSR content remains visible before
hydration; reduced motion disables spatial transitions and force animation.

## Consequences

The overview is explicitly partial when limits apply. It is not a complete
all-nodes-at-once rendering or a new entity-resolution policy. Empty extraction
coverage remains visible as an empty graph, not invented demo knowledge. Offline
fixtures and disposable SQL databases exercise populated graphs without modifying
the user's corpus or making paid calls. Existing custom-route authentication policy
is preserved; changing deployment access policy is a separate concern.
