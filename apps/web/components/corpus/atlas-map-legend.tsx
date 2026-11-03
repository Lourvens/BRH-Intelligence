"use client";

import { Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ATLAS_KIND_TOKENS } from "@/lib/corpus/atlas-palette";
import { entityLabel } from "@/lib/corpus/labels";
import type { AtlasGraph } from "@/lib/corpus/types";

export function AtlasMapLegend({
  data,
  view,
}: {
  data: AtlasGraph;
  view: string;
}) {
  return (
    <details className="atlas-graph-legend">
      <summary aria-label="Légende du graphe">
        <Info size={16} className="atlas-map-legend-icon" aria-hidden />
        <span className="atlas-map-legend-label">Légende</span>
      </summary>
      <ScrollArea className="atlas-map-legend-scroll">
        <div className="atlas-legend-items">
          {[...new Set(data.nodes.map((node) => node.kind))]
            .sort()
            .map((kind) => (
              <span key={kind}>
                <i
                  style={{
                    backgroundColor: `var(${ATLAS_KIND_TOKENS[kind] ?? "--color-teal"})`,
                    borderRadius: kind === "document" ? 2 : "50%",
                  }}
                />
                {kind === "document" ? "Documents" : entityLabel(kind)}
              </span>
            ))}
        </div>
        <p>
          {view === "mentions"
            ? "┄ Mentions dans les publications"
            : "→ Relations documentées"}
        </p>
      </ScrollArea>
    </details>
  );
}
