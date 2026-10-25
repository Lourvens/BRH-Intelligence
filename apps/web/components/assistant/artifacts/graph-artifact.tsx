import { Share2 } from "lucide-react";
import { graphData } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import { ArtifactHeader, ArtifactProvenance } from "./artifact-frame";
import { ExpandableVisualization } from "./expandable-visualization";
import { GraphViews } from "./graph-views";

export function GraphArtifactCard({ artifact }: { artifact: TableArtifact }) {
  const { nodes } = graphData(artifact);
  if (!nodes.length) return null;
  return (
    <figure className="min-w-0 overflow-hidden rounded-sm border border-border bg-surface">
      <ArtifactHeader artifact={artifact} icon={Share2} label={`Graphe · ${nodes.length} nœuds`} actions={<ExpandableVisualization title={artifact.title} subtitle={artifact.subtitle} source={artifact.source} expanded={<GraphViews artifact={artifact} expanded />} />} />
      <GraphViews artifact={artifact} />
      <ArtifactProvenance source={artifact.source} />
    </figure>
  );
}
