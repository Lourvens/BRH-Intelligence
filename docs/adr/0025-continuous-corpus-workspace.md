# 0025 — A responsive corpus workspace with continuous reading

Date: 2026-11-01

## Context

The previous corpus gave large introductory panels and decorative document cards
more space than search and reading. Navigation occupied valuable phone space.
Reading required a route transition for each page, interrupting long reports.
The user requested a complete corpus redesign, including phone UX and Hallmark.

## Decision

Use a compact shared header and three destinations: Documents, Entités, Graphe.
Keep the assistant directly reachable. On phones, navigation and filters use
accessible sheets; document content uses the available width. The catalogue
starts with search, real corpus counts and readable result rows. Entity evidence
and graph exploration keep their existing data and links.

Preserve the project's palette, light/dark themes and typefaces. A scoped
`corpus-workspace.css` defines the rebuilt layout without changing the landing
page or assistant. Remove corpus entrance animation so research content appears
immediately. Retain state feedback and reduced-motion handling.

The reader renders the entry page on the server, then fills a five-page window.
An intersection observer requests the next five pages near the end. Readers can
disable automatic loading and request batches manually. Loading earlier pages
preserves the current visual position. Every page retains its own citation and
official PDF link. The active page updates the shareable URL without a route
transition. Explicit page jumps and page-by-page links remain available.

Batch requests are concurrent and atomic: one failed response rejects the whole
batch, preserving previously displayed text and avoiding gaps. Publication,
artifact, document identity and page bounds are checked before appending.
Automatic loading stops after an error. Unmounting aborts pending requests.

## Tradeoffs and validation

Continuous reading retains loaded pages in memory. Very long documents may
eventually require virtualization; it is deferred to avoid breaking selection,
find-in-page and citation anchors. No backend or schema migration is required.

Focused unit tests cover five-page ordering, final partial batches, failures,
version consistency and invalid ranges. TypeScript and production compilation
are required. Hallmark static lint covers the new reader and stylesheet.
Browser rendering, touch gestures and screen-reader behavior have not been
verified in this task, respecting the prior no-browser-tools request.

Manual follow-up: inspect 320/390px phones, tablet and wide desktop in both
themes; check menu/filter focus, long tables, graph controls, mid-document entry,
prepend anchoring, failed requests and the reader's no-JavaScript navigation.
