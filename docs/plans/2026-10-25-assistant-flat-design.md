# Assistant workspace: flat panel redesign

Date: 2026-10-25. User-authorized implementation following a dedicated analysis
agent, with a separate implementation agent and primary-agent verification.

## Findings

The existing three-panel workspace has the right functional boundaries, but
rounded containers, shadows, a blurred composer and nested source cards compete
with the content. Navigation and chart labels are often 9–11px. The source
excerpt is only 12px, and the selected document is incorrectly labelled as the
primary source. The chart renderer mixes option construction with React and DOM
theme handling. Fixed chart gutters and every-category labels risk clipping on
narrow screens.

## Chosen direction

Use a flat research workspace with solid semantic surfaces, thin dividers,
restrained corner radii and stable hover/focus states. Preserve BRH tokens and
Inter for controls, Montserrat for display headings, and Source Serif 4 for
answers and excerpts. Navy structures primary actions, azure identifies links
and focus, and gold identifies citations and provenance.

- Conversation panel: compact, readable navigation rows; a clear selected
  state; one primary new-conversation action; neutral demonstration status.
- Main panel: a persistent workspace header, aligned reading column and
  composer, concise flat suggestions, and a visibly labelled question field.
- Sources panel: document metadata, readable excerpt, PDF access and citation
  actions in distinct sections; label the currently selected source accurately.
- Answer actions: group Sources, Copy and Share in the same toolbar, with the
  source list disclosed from that location. Share actual answer content and
  citations, including a clipboard fallback and visible action feedback.
- Generated artifacts: a wrapping title/action header, solid plot surface,
  readable responsive labels and a distinct provenance footer. Keep ECharts
  for charts/network graphs and Mermaid for hierarchical diagrams. Preserve
  table fallback and shadcn Dialog focus mode. A chart/data view switch makes
  the underlying values accessible without inventing another data model.

A cosmetic-only pass would leave the layout and component responsibilities
unchanged. Replacing the three-panel workflow would create unnecessary scope.
The chosen direction improves hierarchy within the established workflow while
extracting the responsibilities touched by the redesign.

## Component boundaries

The route composes the workspace. A workspace hook owns demo thread state,
response timing and citation selection. Panel components render their own
surfaces. The composer owns draft input interactions. Scrolling behavior belongs
in a focused hook. Pure chart option construction receives resolved theme values;
the React chart adapter owns theme integration and the ECharts lifecycle hook
owns canvas initialization, resizing and disposal.

Framer Motion provides short source-disclosure transitions, selection feedback
and action-state transitions. Shared motion settings respect reduced motion;
controls retain their labels, focus and visible state without animation.

## Verification

The baseline web TypeScript check passed. The user subsequently requested no
further browser automation. Verify TypeScript, whitespace and component/data
boundaries in source; review responsive classes, reduced-motion handling,
source selection, collapsed rails, mobile Sheets, chart/data switching and
Dialog focus return. Light/dark baseline screenshots predate implementation;
the final design is not browser-verified. Demo transcripts remain local
examples; this work does not connect the unfinished generation backend.
