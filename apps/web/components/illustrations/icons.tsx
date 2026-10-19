import type { SVGProps } from "react";

/**
 * Contextual icon set for BRH Intelligence.
 * 24px grid, 1.5px strokes, currentColor, accessible glyphs.
 * Every icon is carefully paired with central banking, macroeconomic data,
 * OCR document processing, vector search, or cryptographic citation.
 */
export type IconProps = SVGProps<SVGSVGElement>;

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

/** Central Bank / Institutional authority building */
export function BankInstitutionIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v9M9 10v9M15 10v9M19 10v9" />
      <path d="M2 19h20M2 22h20" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </Glyph>
  );
}

/** Monetary Policy & Interest rate vector */
export function MonetaryPolicyIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14.5l3-3 2 2 3.5-3.5" />
      <path d="M14 10h2.5V12.5" />
      <path d="M12 6v1M12 17v1" />
    </Glyph>
  );
}

/** Inflation & Macroeconomic Trend */
export function InflationTrendIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 20h18" />
      <path d="M4 16.5l5.5-5.5 4 4L20 7" />
      <path d="M15.5 7H20v4.5" />
      <circle cx="9.5" cy="11" r="1" fill="currentColor" />
      <circle cx="13.5" cy="15" r="1" fill="currentColor" />
      <circle cx="20" cy="7" r="1.5" fill="currentColor" />
    </Glyph>
  );
}

/** Credit Bureau & Financial Inclusion */
export function CreditBureauIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h3M14 15h3" />
      <circle cx="6.5" cy="7.5" r="0.75" fill="currentColor" />
    </Glyph>
  );
}

/** Targeted OCR Page & Bounding Box extraction */
export function OcrScanIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3" />
      <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" strokeDasharray="2 2" />
      <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth={1.75} />
    </Glyph>
  );
}

/** Exact Document Page with Citation Pin */
export function PageSourceIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6.5 3.5h7L18 8v12.5H6.5z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M9.5 12h5M9.5 14.5h5M9.5 17h3" />
      <circle cx="16.5" cy="17" r="1.4" fill="currentColor" />
    </Glyph>
  );
}

/** A quotation mark that reads as a verified citation */
export function QuoteMarkIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M9.5 7H6.8A2.8 2.8 0 0 0 4 9.8v1.4A2.8 2.8 0 0 0 6.8 14h1.2v1.2A2.8 2.8 0 0 1 5.2 18" />
      <path d="M19.5 7h-2.7A2.8 2.8 0 0 0 14 9.8v1.4a2.8 2.8 0 0 0 2.8 2.8h1.2v1.2a2.8 2.8 0 0 1-2.8 2.8" />
    </Glyph>
  );
}

/** Explicit Refusal Gate (Zero Hallucination) */
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

/** Authentic Seal / Provenance Verification */
export function AuthenticSealIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 2l2.6 2.3 3.5-.3 1.1 3.3 3.1 1.7-1 3.3 1.9 2.9-2.2 2.7.2 3.5-3.4 1-1.8 3.1-3-1.6L9 25.8l-1.8-3.1-3.4-1 .2-3.5-2.2-2.7 1.9-2.9-1-3.3 3.1-1.7 1.1-3.3 3.5.3z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Glyph>
  );
}

/** Verified Shield */
export function ShieldCheckIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3.5 19 6v5.7c0 4.1-2.9 7-7 8.8-4.1-1.8-7-4.7-7-8.8V6z" />
      <path d="m9 12 2.1 2.1L15.5 9.7" />
    </Glyph>
  );
}

/** French-first corpus / Official Language */
export function LanguageIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 4.5h9.5V13H8l-3 2.7V13H4z" />
      <path d="M13.5 9.5H20v8h-1.5v2.5L15.8 17.5h-2.3z" />
    </Glyph>
  );
}

/** FastMCP / Unified Protocol Plug */
export function PlugIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3.2a6 6 0 0 1-12 0z" />
      <path d="M12 17.2V21" />
    </Glyph>
  );
}

/** Document Stack / Central Bank Archive */
export function BookStackIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 6.5 12 3l8 3.5-8 3.5z" />
      <path d="M4 11.5 12 15l8-3.5" />
      <path d="M4 16.5 12 20l8-3.5" />
    </Glyph>
  );
}

/** Spark / Synthesized Intelligence */
export function SparkIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
      <path d="M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5" />
      <circle cx="12" cy="12" r="3.2" />
    </Glyph>
  );
}

/** Vector Search Beam */
export function SearchBeamIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="10" cy="10" r="5.5" />
      <path d="m14.2 14.2 5.3 5.3" />
      <path d="M20.5 3.5 18 6M23 8h-3M17 3V0.5" />
    </Glyph>
  );
}

/** Historical Archive Timeline */
export function ClockIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Glyph>
  );
}

/** LangGraph Reasoning Nodes */
export function LangGraphNodeIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="12" cy="18" r="3" />
      <path d="M8.5 7.5l7 7M15.5 7.5l-7 7M9 6h6" />
    </Glyph>
  );
}

/** Vector Database Embeddings */
export function VectorDatabaseIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
      <circle cx="8" cy="11" r="1" fill="currentColor" />
      <circle cx="16" cy="17" r="1" fill="currentColor" />
    </Glyph>
  );
}

/** Layers Architecture */
export function LayersIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3.5 20 8l-8 4.5L4 8z" />
      <path d="M4 12.5 12 17l8-4.5" />
      <path d="M4 16.5 12 21l8-4.5" />
    </Glyph>
  );
}
