# Landing page redesign — proposed plan

Status: proposed, awaiting sign-off. No implementation yet.
Date: 2026-11-02
Scope: the root page (`apps/web/app/page.tsx`), its header/footer, and the
`/assistant?q=` handoff it depends on. Corpus, assistant and graph pages are
unchanged except for the handoff.

## Why this plan exists

The current landing page is an editorial essay, not a landing page. It is
beautiful and brand-consistent, but it does not answer the five questions a
first-time visitor asks:

1. What is this?
2. Is it for me?
3. What do I get?
4. Can I trust it?
5. What do I do next?

It also hides the strongest assets: **over 1 000 readable documents and 15 000
readable pages** (live counts, never hardcoded), page-level citations, a real
document reader, entity profiles, a graph,
and a streaming assistant that produces charts and refuses when the corpus does
not support an answer.

The page should stop describing a research space and start demonstrating both
halves of the product: the corpus as a real workspace, and the agent as the
fastest way through it.

## Decisions locked in the grill

| Decision | Choice |
|---|---|
| Primary audience | Economists, researchers and students |
| Primary action | Ask the assistant first |
| Positioning | Agent-first research environment: the agent is the primary path, but the corpus is a first-class workspace — search, grouped collections, page reader, graph and connections |
| Headline | “L’agent d’analyse de l’économie haïtienne.” |
| Proof | Live input **plus** pre-generated, verified Q/A demos |
| Structure | Proof-first research funnel: agent jobs first, then a full corpus-workspace section |
| Visual language | Modern SaaS, but BRH modern SaaS — navy/azure structure, gold provenance, real product panels |
| Hero handoff | Auto-send once to `/assistant?q=…`, then rewrite to `/assistant/<threadId>` |
| Demo set | Let verification decide: shortlist, run, keep the three strongest verified answers |

## Copywriting research applied

The plan follows the current consensus:

- **Clarity over cleverness.** The headline names the category and audience; the
  subhead carries the mechanism.
- **Specific over vague.** Claims use real counts, real source types and real
  page citations.
- **One primary CTA.** “Analyser” is the action; “Explorer le corpus” is
  secondary.
- **Proof next to the claim.** Counts and citations sit in the hero, not only at
  the bottom.
- **Show the product.** The demo replaces the constellation as the hero visual.
- **One idea per section.** The page reads as an argument: promise → proof →
  agent jobs → the corpus workspace → method → source → objections → action.

Sources: ClickMinded, ContentBuck (2026), Rob Palmer (2026), Alf Design Group
(2026). The `ui-ux-pro-max` landing patterns used are **Hero-Centric** and
**Trust & Authority**, with a product-demo hero.

## Positioning

**One-line:** L’agent d’analyse de l’économie haïtienne.

**Subhead:** Posez une question. Il lit les publications de la BRH, compare les
documents, construit les graphiques et renvoie chaque réponse à sa page.

**What the page must prove:**

- A real question becomes a real, readable analysis.
- The analysis can include a chart or a comparison.
- Every claim has a document and a page behind it.
- The corpus is a real workspace: searchable, grouped into families, readable
  page by page, and connected through entities and the graph.
- The agent is the fast path; the corpus is the depth. Neither is a demo prop
  for the other.
- When the corpus cannot answer, the agent says so.
- The corpus is public, French and measurable.

**What the page must not claim:** live indexing, exhaustive coverage, real-time
updates, guaranteed accuracy, certifications, latency promises, testimonials, or
MCP integrations that are not shipped. The graph is an exploration aid, not a
complete map of every relationship in the corpus.

## Page architecture

### 1. Header

Keep the aligned `landing-wrap` header and the mobile sheet. Update the nav
anchors to the new sections:

- **Agent** → `#assistant` or directly `/assistant`
- **Corpus** → `/brh-corpus`
- **Méthode** → `#methode`
- **Sources** → `#sources`

One primary CTA: **“Poser une question”** → `/assistant`.

### 2. Hero — promise + input + verified demo

Two columns on desktop (`1.05fr / 1fr`), stacked on mobile.

**Left column**

- Eyebrow: `BRH INTELLIGENCE · AGENT D’ANALYSE`
- H1: **L’agent d’analyse de l’économie haïtienne.**
- Subhead: *Posez une question. Il lit les publications de la BRH, compare les
  documents, construit les graphiques et renvoie chaque réponse à sa page.*
- Question form:
  - Label (visible or sr-only): “Votre question”
  - Placeholder: `Quel était le taux d’inflation en novembre 2025 ?`
  - Primary button: **Analyser**
  - Three example chips that prefill the input, e.g. inflation, reserves,
    comparison.
  - Secondary link: **Explorer le corpus** → `/brh-corpus`
- Proof line under the form: *Réponses citées · Sources publiques · Français*
- No second equal CTA.

**Right column — the demo panel**

A product panel with browser/app chrome, three tabs, and a verified example in
each tab:

- **Suivre une série** — chart + short answer + 1–2 citations.
- **Comparer deux périodes** — comparison table or multi-series chart + citations.
- **Retrouver un texte** — document card + excerpt + page citation.

Each tab shows:

- the question (small, quoted),
- a 2–3 sentence answer in Source Serif,
- the chart or table,
- source chips with document title and page,
- a footer: *Exemple vérifié le <date> · Ouvrir la page source*.

The panel must be a real component, not a screenshot, so it stays responsive and
accessible. Label it clearly as an example. If an example fails verification, it
does not ship.

**Hero behaviour**

- The form is a GET form to `/assistant` with `name="q"` so it works without JS
  for navigation.
- The assistant shell reads `q`, sends once, then replaces the URL with the
  thread. Guard against duplicate sends (ref + `sessionStorage`).
- On stream failure, keep the question and show a retry plus a
  “Rechercher dans le corpus” fallback.
- Do not put sensitive questions in analytics or logs.

### 3. Proof strip

A full-width band directly under the hero, on `surface-alt` with hairlines:

- **Documents lisibles** — `CorpusCount`
- **Pages lisibles** — `CorpusCount`
- **Sources** — Publications BRH
- **Traçabilité** — Document + page cités

Server-render the counts where possible (or reserve width) to avoid a number
popping in and shifting the hero. Never show zero when the API is unavailable;
show `—`.

### 4. What the agent does with the corpus (bento)

Heading: **Ce que l’agent fait avec le corpus.**
Intro: *Trois façons de partir d’une question, sans perdre la source.*

Cards (one large + two, stacked on mobile):

1. **Suivre une série** — “Faites apparaître une évolution, puis ouvrez la note
   qui la documente.” Visual: line chart. Example question chip.
2. **Comparer deux périodes** — “Confrontez deux publications et gardez chaque
   source.” Visual: two-row comparison.
3. **Retrouver un texte** — “Circulaires, avis, rapports : arrivez à la page
   exacte.” Visual: document + page citation.

Each card links to the assistant with the example question. The agent leads the
page: this is the first full section after the hero and proof strip.

### 5. The corpus workspace

The transition line introduces the second act: *L’agent est la voie rapide. Le
corpus est la profondeur. Les deux sont ouverts.*

Heading: **Tout le corpus. Une seule entrée.**
Subhead: *Cherchez dans l’ensemble des publications, filtrez par famille, année
ou entité, lisez la page exacte et suivez les connexions.*

A 2×2 bento of real product previews (not concept art):

1. **Chercher dans tout le corpus** — search across documents and passages, with
   family/year/entity filters. Visual: the real search bar and filter chips.
   Link: `/brh-corpus`.
2. **Des collections groupées** — Circulaires & avis, Conjoncture & inflation,
   Rapports & bilans. Show live counts per family where available. Link: filtered
   catalogue.
3. **Lire la page exacte** — page-marked Markdown plus the original PDF, with a
   page citation. Visual: the real reader, not a mock paper. Link: a real
   document.
4. **Voir les connexions** — entities and the document graph. Visual: a real
   graph preview, not the constellation. Links: `/brh-corpus/graph` and
   `/brh-corpus/entities`.

Close the section with the honest note: *Mesures du catalogue. Ni couverture
exhaustive, ni flux en temps réel. Le graphe est une aide à l’exploration, pas une
cartographie complète des relations.*

### 6. How it works — “De la question à la source”

Four steps, one line each:

1. **Posez votre question en français.**
2. **L’agent cherche les passages et les données dans le corpus.**
3. **Il compare, met en forme et cite.**
4. **Vous ouvrez chaque source à la page citée.**

No chain-of-thought language, no simulated progress.

The corpus is not gated by this flow: add a line under the steps — *Le corpus se
parcourt aussi sans l’agent : recherche, filtres, lecteur page par page, entités
et graphe.*

### 7. Why the source matters

Heading: **Une réponse sans source n’est pas une réponse.**
Subhead: *Chaque réponse renvoie au document et à la page. Si le corpus ne
contient pas la réponse, l’agent le dit.*

Two-column proof:

- A real document page with a highlighted passage and a gold citation chip
  (`[1]`, title, page, PDF link).
- Three short assurances:
  - **Document + page** — “Le passage reste localisé dans le PDF officiel.”
  - **Refus explicite** — “Pas de passage pertinent, pas de réponse inventée.”
  - **Français, sources publiques** — “Publications de la BRH, sans contenu
    externe.”

### 8. FAQ

Heading: **Questions fréquentes.**
Accordion (shadcn `Accordion`, install if missing):

- D’où viennent les documents ?
- Comment vérifier une réponse ?
- Et si le corpus ne contient pas la réponse ?
- Le corpus est-il à jour ?
- Puis-je explorer sans l’assistant ?
- En quelle langue sont les documents ?

Answers must be factual and short.

### 9. Final CTA

Navy panel with a soft azure mesh, not a generic centred block:

- Heading: **Posez votre première question.**
- Repeat the question form (same component) or a primary button that focuses the
  hero input.
- Secondary: **Explorer le corpus**.
- Footer provenance line: *Sources publiques · Réponses citées page par page.*

## Visual direction — BRH modern SaaS

- **Palette:** navy for structure and primary actions, azure for links/focus,
  gold only for provenance/citation highlights. No purple-AI gradients.
- **Surfaces:** white `surface` cards on `bg`, soft azure/navy atmospheric
  gradients behind the hero, a subtle dot/grid field, 16–24px radii, restrained
  shadows.
- **Typography:** Montserrat display, Inter UI, Source Serif 4 for the demo
  answer and document excerpt. Reading text 15–16px, line-height ~1.7.
- **Product panels:** real app chrome, tabs, chart, source chips, search filters,
  reader and graph previews. The product is the imagery.
- **Agent/corpus balance:** the hero is agent-first, but the corpus workspace is
  a full section with its own visual weight. It must not look like a footnote to
  the chat.
- **Motion:** tab crossfade and chart entrance 150–220ms, transform/opacity only;
  input focus ring; no scroll polling; respect `prefers-reduced-motion`.
- **Do not:** use the constellation as the hero image, duplicate the same
  illustration twice, or use gradients on the data.

## Technical plan

### New/changed files

- `components/home/landing/` — hero, question form, demo panel, proof strip,
  agent jobs, corpus workspace, how-it-works, provenance, FAQ, closing.
- `lib/landing/demo.ts` — verified demo entries: question, answer, chart/table
  data, sources, verification date.
- `lib/landing/corpus-preview.ts` — real families, counts and sample document /
  graph data used by the workspace previews; no invented relationships.
- `app/page.tsx` — assemble the new sections; metadata.
- `lib/content/navigation.ts` — new anchors/labels.
- `components/assistant/*` — `q` handoff and auto-send.
- `app/assistant` — read `q`; show a retry + corpus fallback on failure.

### Hero demo rendering

- Use shadcn `Tabs` for the three examples.
- Use **visx** for the single landing chart (`@visx/xychart`, `@visx/responsive`,
  `@visx/axis`, `@visx/grid`). Do not load ECharts above the fold; ECharts stays
  in the assistant artifacts.
- If a verified example is a table, render a compact semantic table instead of a
  chart.
- Every chart needs a text summary / accessible table alternative.

### Corpus workspace rendering

- **Search preview:** a real search field with the catalogue's filter vocabulary
  (family, year, entity). It can be non-interactive and link to `/brh-corpus`,
  or submit the query directly. Do not duplicate the full catalogue.
- **Grouped collections:** the three families with live counts where the API
  provides them; otherwise omit the count rather than invent one.
- **Reader preview:** a real page-marked document excerpt with a page number and
  a link to the PDF. Reuse the reader's visual language; do not mock a paper.
- **Graph preview:** a real graph asset or a lazy-loaded ECharts preview below
  the fold, with alt text and a link to `/brh-corpus/graph`. The constellation is
  not the graph.
- **Weight:** no ECharts in the hero; the graph preview is lazy or static. The
  workspace section must not load the full atlas bundle.

### Assistant handoff

- Form: `<form action="/assistant" method="get"><input name="q" … /></form>`.
- `AssistantShell` reads `q` via `useSearchParams`, sends once, and
  `router.replace(`/assistant/${threadId}`)` after the run starts.
- Guard with a ref + `sessionStorage` keyed by the question to survive Strict
  Mode and reloads.
- If the agent is unavailable, keep the page usable: show the error, a retry,
  and a link to `/brh-corpus?q=…`.
- Remove the old “intégration à venir” copy everywhere; the assistant is live.

### Content verification

Before the hero ships:

1. Shortlist 6 candidate questions across the three families.
2. Run each against the real corpus.
3. Verify every citation (document, page, quote).
4. Keep the three strongest answers: one series, one comparison, one text.
5. Record the verification date and the exact source links.
6. If fewer than three pass, ship two and adjust the tabs; never invent a third.

### Metrics

Primary: **first question submitted** (hero form or assistant composer).
Secondary: demo tab opened, corpus search, document opened, graph/entity opened,
citation clicked, FAQ opened.

Guardrails: assistant error rate, time-to-first-token, corpus search latency.

Use the existing analytics stack if present; otherwise add lightweight events
behind a flag. Do not log question text without consent.

## Accessibility and performance

- Visible labels for the question input; errors announced.
- Tabs: keyboard support, `aria-selected`, panel labelling.
- Charts: accessible summary/table; no color-only meaning.
- Focus order matches the visual order; 44px targets.
- Reduced motion: no tab slide, no chart draw, no reveal.
- LCP: server-render the headline and first demo panel; do not load ECharts in
  the hero; preload only the hero font weights.
- No horizontal overflow from 320 to 2560.
- Dark mode checked independently; the demo panel and chart must work on
  `surface` and `#171A20`.

## SEO

- Title: **BRH Intelligence — L’agent d’analyse de l’économie haïtienne**
- Description: *Posez une question sur les publications de la BRH, ou explorez
  tout le corpus. L’agent compare les documents, construit les graphiques et
  cite chaque page.*
- One `h1`; `h2` per section.
- Update the OG image to the new promise and product panel.
- Add `FAQPage` structured data only for the real FAQ; keep `Organization` and
  `WebSite`.

## Phases

| Phase | Work | Exit criterion |
|---|---|---|
| 0. Verify | Shortlist, run, verify 3 demos; confirm counts and sources | Three verified examples + real links |
| 1. Hero | Question form, handoff, demo panel, proof strip | Submit → assistant auto-runs; demo is accessible |
| 2. Narrative | Agent jobs, corpus workspace, how-it-works | Both the agent and the corpus are first-class; three agent jobs and four corpus capabilities map to real features |
| 3. Trust | Provenance, coverage note, FAQ | Every claim has a source or a measurement |
| 4. Polish | Copy, SEO, OG, a11y, motion, analytics | Checks pass; no stale copy |
| 5. Launch | Visual QA at 320/390/768/1024/1440/2560, light/dark | Sign-off |

## Acceptance criteria

- A first-time visitor can explain what it is, who it is for and what to do next
  within five seconds.
- The hero input sends a real question to the assistant and the answer streams.
- The demo shows three verified analyses when three pass verification.
- The corpus workspace is a first-class section with search, grouped collections,
  the reader and the graph; it does not read as a footnote to the chat.
- The page never claims a capability that is not shipped.
- The primary CTA appears in the hero, after the proof, and in the closing.
- No “intégration à venir”, no duplicated constellation, no dead sections.
- `tsc --noEmit`, tests, and the launch QA pass in both themes.

## Risks

| Risk | Mitigation |
|---|---|
| The agent is slow or fails during the demo | Streaming state, retry, corpus-search fallback |
| A demo answer cannot be verified | Ship fewer tabs; never fabricate |
| “Analysis” overpromises | Keep “analyse documentaire”/“aide à l’analyse” in the legal copy; show only grounded outputs |
| Counts drift | Use the live stats API; no hardcoded numbers |
| Corpus previews drift from the real product | Reuse real components/data and link every preview to the live page |
| The corpus is read as a footnote | Give it a full section, real previews and a secondary CTA in the hero and closing |
| Modern SaaS drifts from BRH | Tokens, typography, gold-for-provenance only |
| Bundle weight | visx for one chart; ECharts stays in the assistant; graph preview lazy/static |

## Open questions for sign-off

1. Does “agent d’analyse” need legal/brand approval from the BRH before launch?
2. Is a real BRH document excerpt approved for the provenance section?
3. Which three demos survive verification?
4. Is there an analytics stack, or should events be added behind a flag?
5. Should the assistant handoff put the question in the URL, or pass it through
   client state to avoid long/private URLs in history?
