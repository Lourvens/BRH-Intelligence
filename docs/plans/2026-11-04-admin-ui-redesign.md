# Admin interface redesign

## Problem

The first dashboard meets functional requirements but has a weak visual
hierarchy and makes operators scroll through unrelated tasks. Repeated panel
markup diverges from the installed component library. The user rated its UI
3/10 and requested coordinated specialist work and customized library UI.

## Direction

- A compact application shell with persistent desktop sidebar and shadcn
  mobile navigation; three workspaces: overview, feedback and ingestion.
- Overview emphasizes four concise metrics, recorded activity and service
  health. Show a bounded ingestion preview, not the full feedback inbox.
- Feedback is a compact semantic table, adapted for mobile, with clear status
  badges and a review dialog that separates report context from editing.
- Shared panel and metric components compose shadcn Card. Shared status
  treatments compose Badge. Tables use the official shadcn primitive.
- Reuse BRH typography, semantic colors and installed ECharts. No fabricated
  trends or metrics. Unknown health has a distinct neutral treatment.
- Useful hover, focus, pending and selected feedback; short entry/exit motion
  only where it clarifies state, with reduced-motion support.

## Responsibilities

Lead owns integration, library setup, loading/login consistency and release
checks. UX planner reviews task flow and owns browser acceptance tests. UI
engineer owns shell, overview and ingestion. UX/frontend engineer owns inbox
and review. Each worker has separate files; the lead reviews screenshots and
resolves integration issues before committing.

## Acceptance

At desktop size, the first viewport exposes metrics, activity and health.
Navigating to feedback presents aligned metadata and compact review actions.
The mobile view stays within 320px and keeps navigation and controls usable.
Dark theme, keyboard navigation, dialog close/focus restoration, feedback
persistence, thread context and session protection remain functional.
