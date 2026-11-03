# Landing motion audit and implementation

The landing uses an expressive editorial motion level based on Emil
Kowalski's `animate`, `find-animation-opportunities`, and
`animation-performance` guidance. Motion explains the product and source
workflow; controls and data remain stable.

| Section | Motion |
| --- | --- |
| Hero | Immediate CSS entrance: copy rises 14px with a 70ms stagger; the agent preview settles from 24px right and `.98` scale; the glow expands once. |
| Proof | Four cells rise 10px and settle from `.96` scale. Counts never count up. |
| Agent | Heading and cards reveal in sequence. The series path draws, comparison bars grow, and citation row appears once. |
| Corpus | Transition statement wipes vertically; heading and cards enter; search result, collection stack, and reader citation finish the explanation. |
| Graph | Heading enters and the explorer frame unmasks. Toolbar and inspector fade; nodes, edges, labels, zoom, and selection data do not move for decoration. |
| Method | Steps enter in order and connectors draw horizontally on desktop or vertically on phones. |
| Provenance | At 820px and above, a 170vh section pins its composition while document, highlight, evidence, and assurances progress with scroll. Smaller screens use a normal one-time reveal. |
| FAQ | Heading and rows reveal once. Pointer accordion changes keep the existing short state transition; keyboard changes remain immediate. |
| Closing | Panel unmasks and copy/form/proof stagger in. Desktop glow moves only 16px across the section's scroll range. |
| Footer | Brand and link groups make a short final entrance; the divider draws once. |

Entrances use `cubic-bezier(.23,1,.32,1)`; masks and composed movement use
`cubic-bezier(.77,0,.175,1)`. Phone movement is capped at 8px and phone groups
do not stagger. Every observer disconnects after its first trigger. The
scroll-linked provenance and closing values use Framer Motion's scroll driver,
avoiding React renders on each frame.

Reduced motion removes translation, scaling, clipping, path drawing, stagger,
parallax, and desktop pinning. Server output stays in its final visible state;
CSS supplies the initial hero entrance, and scroll enhancement begins only
after client hydration. Unsupported JavaScript leaves all content readable.

Rejected candidates remain: animated factual counts, graph node/edge drawing,
moving chart values, scroll snapping, multiple pinned sections, repeated
reveals, and animated keyboard navigation.
