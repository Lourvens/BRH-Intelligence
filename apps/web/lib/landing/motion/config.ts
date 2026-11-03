export const easeOut = [0.23, 1, 0.32, 1] as const;
export const easeInOut = [0.77, 0, 0.175, 1] as const;

export type Reveal = {
  trigger: string;
  targets: string;
  y?: number;
  scale?: number;
  duration?: number;
  stagger?: number;
  amount?: number;
  delay?: number;
};

export const reveals: Reveal[] = [
  {
    trigger: ".proof-strip",
    targets: ".proof-grid > div",
    y: 10,
    scale: 0.96,
    duration: 0.35,
    stagger: 0.05,
  },
  {
    trigger: ".jobs-section",
    targets: ".section-heading > *, .job-card",
    y: 18,
    scale: 0.985,
    duration: 0.5,
    stagger: 0.07,
  },
  {
    trigger: ".corpus-section",
    targets: ".corpus-heading > *, .bento-card",
    y: 18,
    scale: 0.985,
    duration: 0.55,
    stagger: 0.08,
    amount: 0.08,
  },
  {
    trigger: ".graph-section",
    targets: ".graph-section-heading > *",
    y: 16,
    scale: 0.99,
    duration: 0.6,
    stagger: 0.1,
    amount: 0.08,
  },
  {
    trigger: ".method-section",
    targets: ".method-title, .step, .method-note",
    y: 14,
    duration: 0.4,
    stagger: 0.08,
  },
  {
    trigger: ".provenance-section",
    targets:
      ".provenance-copy > .eyebrow, .provenance-copy > h2, .provenance-copy > .lead",
    y: 14,
    duration: 0.48,
    stagger: 0.07,
    amount: 0.1,
  },
  {
    trigger: ".faq-section",
    targets: ".faq-heading, .faq-item",
    y: 12,
    duration: 0.36,
    stagger: 0.035,
  },
  {
    trigger: ".closing-section",
    targets: ".closing-copy > *, .closing-panel form, .closing-proof",
    y: 14,
    duration: 0.5,
    stagger: 0.06,
    amount: 0.15,
    delay: 0.12,
  },
  {
    trigger: "footer",
    targets: ".footer-inner > *, .footer-links > div, .footer-bottom",
    y: 6,
    duration: 0.3,
    stagger: 0.05,
    amount: 0.1,
  },
];

export const PREPARED_SELECTORS =
  ".graph-explorer, .graph-toolbar, .graph-inspector, .transition-line, .result-line, .collection-stack > *, .citation-pin, .citation-line, .closing-panel";

export const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
export const DESKTOP_QUERY = "(min-width: 820px)";
export const COMPACT_QUERY = "(max-width: 819px)";
export const PHONE_QUERY = "(max-width: 600px)";
