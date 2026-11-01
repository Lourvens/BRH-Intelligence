# UI interaction motion

User preference, recorded 2026-11-01: consider useful microinteractions on every
UI build. The installed `fixing-motion-performance` skill governs animation
work; AGENTS.md records this for future sessions.

## Mechanisms and coverage

`apps/web/app/interaction-motion.css` defines shared 140ms feedback, 200ms
entry and 140ms exit timing. CSS handles hover, press, focus, selected controls,
native disclosures and Radix surface animations. Framer Motion handles React
state changes, including exit presence. No new animation dependency is needed.

| Surface | Interaction |
| --- | --- |
| Corpus header | Native CSS scroll progress, navigation hover/press/focus |
| Search and filters | Search focus, segmented choices, chips, selection colors, filter disclosure entry/exit |
| Document and entity results | Hover/press feedback and visible focus; no delayed content reveals |
| Reader | Information rail entry/exit, copy confirmation, native disclosure feedback, figure dialog entry/exit |
| Graph | Existing reduced-motion-aware ECharts updates, inspector selection and panel entry/exit, list fade, control feedback |
| Assistant sidebar | Width changes apply once; inner contents fade without continuously relaying out messages |
| Assistant sources | Sheet entry/exit, existing source selection and count feedback |
| Assistant composer | Send/stop state transition, press and focus feedback |
| Assistant conversation | Existing conversation transition, activity entry/exit, return-to-answer button entry/exit |
| Expanded artifacts | Shared dialog and overlay entry/exit |
| Selects and tooltips | Short opening/closing fade; existing Radix keyboard/focus behavior |

Opening and closing keyframes are explicit; they do not rely on animation
utility classes that may have no generated definition. Sheet direction is
declared with `data-side`. Radix retains the closing element until its CSS
animation ends, preserving focus management.

## Constraints

Animate transform and opacity. Avoid continuously changing large dimensions or
adding animation loops driven by scroll events. CSS scroll timelines provide
progress when supported; browsers without support simply omit the indicator.
Reading text remains visible and batches append without entrance animation or
forced scrolling. Existing follow-message behavior remains user controlled.

CSS reduced-motion rules include portaled sheets, dialogs, selects and tooltips.
React state transitions use `useReducedMotion`; graph and activity transitions
also snap when reduced motion is requested. Focus feedback is immediate.

Screenshots and browser-check artifacts belong outside the repository.
