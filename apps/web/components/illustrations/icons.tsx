import type { SVGProps } from "react";

/**
 * The page's custom icon set. 24px grid, 1.5px strokes, `currentColor`, no
 * fills — they are illustrations first, UI icons second. Lucide stays for
 * micro-UI (arrows, checks, external links).
 */
type IconProps = SVGProps<SVGSVGElement>;

function Glyph({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** A document page with a cited line. */
export function PageSourceIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6.5 3.5h7L18 8v12.5H6.5z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M9.5 12h5M9.5 14.5h5M9.5 17h3" />
      <circle cx="16.5" cy="17" r="1.4" />
    </Glyph>
  );
}

/** A quotation mark that reads as a citation, not a chat bubble. */
export function QuoteMarkIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M9.5 7H6.8A2.8 2.8 0 0 0 4 9.8v1.4A2.8 2.8 0 0 0 6.8 14h1.2v1.2A2.8 2.8 0 0 1 5.2 18" />
      <path d="M19.5 7h-2.7A2.8 2.8 0 0 0 14 9.8v1.4a2.8 2.8 0 0 0 2.8 2.8h1.2v1.2a2.8 2.8 0 0 1-2.8 2.8" />
    </Glyph>
  );
}

/** A gate: the explicit refusal branch. */
export function RefusalGateIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M5 21V7.5L12 3l7 4.5V21" />
      <path d="M5 11.5h14M5 16h14" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </Glyph>
  );
}

/** Verified source / no advice without evidence. */
export function ShieldCheckIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3.5 19 6v5.7c0 4.1-2.9 7-7 8.8-4.1-1.8-7-4.7-7-8.8V6z" />
      <path d="m9 12 2.1 2.1L15.5 9.7" />
    </Glyph>
  );
}

/** French-first corpus. Two speech bubbles, no flag. */
export function LanguageIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 4.5h9.5V13H8l-3 2.7V13H4z" />
      <path d="M13.5 9.5H20v8h-1.5v2.5L15.8 17.5h-2.3z" />
    </Glyph>
  );
}

/** MCP / shared retrieval core. */
export function PlugIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3.2a6 6 0 0 1-12 0z" />
      <path d="M12 17.2V21" />
    </Glyph>
  );
}

/** Document families / archive. */
export function BookStackIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 6.5 12 3l8 3.5-8 3.5z" />
      <path d="M4 11.5 12 15l8-3.5" />
      <path d="M4 16.5 12 20l8-3.5" />
    </Glyph>
  );
}

/** A single, sourced answer. */
export function SparkIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
      <path d="M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5" />
      <circle cx="12" cy="12" r="3.2" />
    </Glyph>
  );
}

/** Retrieval: a question with a beam into the corpus. */
export function SearchBeamIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="10" cy="10" r="5.5" />
      <path d="m14.2 14.2 5.3 5.3" />
      <path d="M20.5 3.5 18 6M23 8h-3M17 3V0.5" />
    </Glyph>
  );
}

/** Archive / dated perimeter. */
export function ClockIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Glyph>
  );
}

/** Architecture: pages and their layers. */
export function LayersIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3.5 20 8l-8 4.5L4 8z" />
      <path d="M4 12.5 12 17l8-4.5" />
      <path d="M4 16.5 12 21l8-4.5" />
    </Glyph>
  );
}
