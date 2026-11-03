import type { ChatCitation } from "./types";

export function uniqueCitations(citations: readonly ChatCitation[]) {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    if (seen.has(citation.id)) return false;
    seen.add(citation.id);
    return true;
  });
}

/** Shared count wording for every surface that lists conversation sources. */
export function citationCountLabel(count: number): string {
  if (!count) return "Aucune référence";
  const plural = count > 1 ? "s" : "";
  return `${count} référence${plural} active${plural}`;
}
