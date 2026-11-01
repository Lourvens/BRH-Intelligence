/**
 * Brand tokens, straight from services/analytics/DESIGN.md.
 *
 * The clip runs on navy-deep (the guide's "dark surfaces, footers" role) with
 * white type. Gold appears as a *fill* only — the citation chip — and never as
 * text, because gold on white is 1,5:1.
 */
export const theme = {
  navy: "#031A71",
  navyDeep: "#05155B",
  azure: "#009CDC",
  gold: "#E8D833",
  goldInk: "#A67C00",
  surface: "#FFFFFF",
  ink: "#0B1729",
  inkMuted: "#5A6B87",
  border: "#E3E9F2",
} as const;

/** Inter for body and labels, Montserrat for display. */
export const font = {
  display: "'Montserrat', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
} as const;

const NARROW = "\u202F";

/** French numbers: narrow no-break space for thousands, comma for decimals. */
export function fr(value: number, decimals = 0): string {
  const fixed = value.toFixed(decimals);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return fraction ? `${grouped},${fraction}` : grouped;
}
