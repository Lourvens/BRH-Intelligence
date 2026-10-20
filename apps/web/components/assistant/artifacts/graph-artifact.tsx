import { Share2 } from "lucide-react";

import { graphData } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";

import { ExpandableVisualization } from "./expandable-visualization";
import { GraphViews } from "./graph-views";

export function GraphArtifactCard({ artifact }: { artifact: TableArtifact }) {
  const { nodes } = graphData(artifact);
  if (!nodes.length) return null;

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-border px-3.5 py-3">
        <div>
          <figcaption className="font-display text-caption font-bold text-navy-ink">
            {artifact.title}
          </figcaption>
          <p className="text-[10px] text-ink-muted">{artifact.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="inline-flex items-center gap-1 rounded border border-navy-ink/15 bg-navy-ink/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-navy-ink">
            <Share2 className="size-3" aria-hidden />
            Graphe · {nodes.length} nœuds
          </span>
          <ExpandableVisualization
            title={artifact.title}
            subtitle={artifact.subtitle}
            source={artifact.source}
            expanded={<GraphViews artifact={artifact} expanded />}
          />
        </div>
      </div>

      <GraphViews artifact={artifact} />

      <div className="border-t border-border px-3.5 py-2 text-[10px] text-ink-muted">
        Source : {artifact.source}
      </div>
    </figure>
  );
}
