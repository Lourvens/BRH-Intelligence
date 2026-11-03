import { documentPageHref } from "@/lib/corpus/links";

import { graphNodeById } from "./fixtures";
import type { GraphEdge } from "./types";

export function evidenceHref(edge: GraphEdge): string {
  const source = graphNodeById(edge.source);
  let slug = source?.type === "document" ? source.slug : undefined;
  if (!slug && edge.sourceTitle?.includes("Bulletin")) {
    slug = graphNodeById("doc-bulletin-97")?.slug;
  }
  if (!slug && edge.sourceTitle?.includes("Circulaire")) {
    slug = graphNodeById("doc-circulaire-cec-10")?.slug;
  }
  return slug
    ? documentPageHref(slug, edge.page)
    : `/brh-corpus?q=${encodeURIComponent(edge.sourceTitle ?? edge.quote)}`;
}
