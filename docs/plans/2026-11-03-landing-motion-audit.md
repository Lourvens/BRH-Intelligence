# Landing motion audit and implementation

Scope: every section rendered by `ResearchLandingV2`, plus the site header and
mobile navigation. Guidance: Emil Kowalski's `animate` and its recipes; the
opportunity skill supplied the frequency/purpose gate during inspection.

| Section | Finding and decision | Implementation |
| --- | --- | --- |
| Header/navigation | Frequent navigation needs immediate response; mobile menu already uses an accessible Radix sheet. | Retain existing sheet motion/focus; no header entrance or keyboard navigation delay. |
| Hero question | Input and example chips must respond directly to a press. | Immediate focus ring, short press feedback, preserve chip-to-input focus and ordinary form navigation. |
| Hero demo | Content replayed a translate entrance and chart draw on each tab change. Keyboard tab navigation was incomplete. | Pointer changes fade from .65 to 1 for 160ms; keyboard changes are immediate. Add arrow/Home/End navigation and panel labeling. Keep chart data static. |
| Corpus proof strip | Counts are factual data, including asynchronously loaded values. | No count-up or reveal animation. |
| Agent jobs | Explanatory icons are eligible for occasional marketing motion. | Once-only 300ms opacity/8px translation on visibility. No text or chart motion, no loop, cleanup and runtime reduced-motion cancellation. |
| Corpus workspace | Cards lifted as if the entire card were a button, but only embedded links act. | Remove whole-card lift; give actual links border/underline feedback. Introduce only the three heading icons with a 6px rise/opacity for 250ms. Keep reader excerpt and collection stack stable. |
| Graph | Node/edge selection, list view and zoom already have state feedback. Reading the evidence is the purpose. | Tune zoom to the common 200ms curve, retain selection colors, fade a newly inserted path result. No force simulation, line drawing, or staggered data. |
| Method | Sequential numbered steps explain the flow; connectors can reinforce their order. | Reveal only connectors with scaleX (desktop) or scaleY (phone) for 250ms. Numbers and text stay static. |
| Provenance | Source excerpt is reading content, already theme-corrected. | Keep document still; fade only its gold source marker from .5 to 1 for 250ms. No floating paper or highlight sweep. |
| FAQ | Grid-row transition combined with open-only padding caused abrupt movement. Closed content lacked explicit inert state. | Short height/opacity transition (isolated accordion exception), constant inner padding, inert and aria-hidden closed panels. Keyboard/reduced-motion changes snap. |
| Closing question | Same action as hero. | Same press and focus feedback; do not delay submission for an exit effect. |
| Footer | Plain navigation, low benefit from entry animation. | Link underline on fine-pointer hover and immediate keyboard focus. No entrance or stagger. |

The strongest opportunities are FAQ state continuity and demo state clarity.
Rejected: animated counts (functional data), repeated chart drawing (reading
data), whole-page scroll reveals (delay content), floating provenance paper
(distracts from verification), and footer/header staggers (navigation frequency).

Motion uses the existing duration tokens. The landing scopes the common easing
token to the skill's `cubic-bezier(.23,1,.32,1)`. CSS handles hover/press/focus;
Motion handles accordion height and tab state; WAAPI/IntersectionObserver handle
the once-only explanatory icon entrance. Hover movement requires a fine pointer.
No new dependency, per-frame React state or scroll polling is added. Content is
visible in server output and with motion disabled.

## Approved scroll cues

The user approved four once-only cues: three agent icons (8px rise/300ms),
three corpus icons (6px rise/250ms), three method connectors (250ms scale),
and the provenance marker (250ms opacity). All use the existing landing
ease-out token. IntersectionObserver triggers at 25% visibility; it observes
the step or source row for thin decorative elements. Desktop icon stagger is
50ms, connector stagger 60ms. Phones have no stagger; each item triggers when
visible. Connectors grow from the left on desktop and the top on phones.

Targets are unobserved after the first trigger. Changing reduced-motion
preference or rotating the viewport cancels running effects and restores their
CSS final state. Unsupported APIs and no JavaScript leave the final content
visible. There is no pinning, parallax, continuous scroll sampling or replay.
