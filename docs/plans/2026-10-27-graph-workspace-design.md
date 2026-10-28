# Full-view research graph

Approved scope: graph UI at `/brh-corpus/graph`.

The graph fills the research viewport below navigation. Search, removable filter
chips, view controls, legend, counts and camera tools sit within its boundary.
The inspector opens only for a selected node or edge. Desktop filters use a
shadcn Popover; mobile filters and selection use shadcn Sheets, one at a time.
Scrollable panels use the existing shadcn ScrollArea primitive.
A focus mode expands the workspace over navigation and exits with Escape.

## Components and state

- AtlasWorkspace composes the canvas and overlays.
- useAtlasWorkspace owns URL-backed exploration state and React Query loading.
- AtlasSearch renders query entry and bounded results from the matching graph.
- AtlasFilters owns explicit filter drafts and active chips.
- AtlasViewControls switches graph semantics and accessible list display.
- AtlasCanvasTools provides zoom, fit and fullscreen controls with tooltips.
- AtlasInspector retains connections, evidence and source links.

Preserve existing graph API limits and cancellation, published source evidence,
mention/relation distinction, query parameters and reader links. Opening cards
must not recreate the ECharts instance. Keep the canvas mounted in list mode.

## Verification

Run TypeScript, existing Bun corpus tests and the production build. Check graph
route and API over HTTP. User prohibits agent-browser; visual and browser
interaction checks are not run. Verify focus return, reduced motion, small-screen
constraints, loading/error/empty states and URL behavior by code review.
