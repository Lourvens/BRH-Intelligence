"use client";

import { ArrowUpRight, FileText, Network } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { entityLabels, relationshipLabels } from "@/lib/corpus/labels";
import type { AtlasGraph } from "@/lib/corpus/types";

export function AtlasGraphList({
  data,
  selected,
  choose,
}: {
  data: AtlasGraph;
  selected: string;
  choose: (id: string) => void;
}) {
  const nodes = new Map(data.nodes.map((node) => [node.id, node]));
  return (
    <ScrollArea
      className="atlas-map-list-scroll"
      aria-label="Liste accessible du graphe"
    >
      <div className="atlas-graph-list">
        <h2 className="mb-4 font-display text-lg font-semibold">
          Nœuds affichés
        </h2>
        {data.nodes.map((node) => (
          <button
            key={node.id}
            aria-pressed={selected === node.id}
            onClick={() => choose(node.id)}
          >
            <span>
              {node.kind === "document" ? (
                <FileText className="mr-2 inline" size={15} />
              ) : (
                <Network className="mr-2 inline" size={15} />
              )}
              {node.label}
              <small className="mt-1 block text-ink-muted">
                {entityLabels[node.kind] ?? "Publication"}
              </small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
        <h2 className="mb-3 mt-7 font-display text-lg font-semibold">
          Liens et preuves
        </h2>
        {data.edges.map((edge) => (
          <button
            key={edge.id}
            aria-pressed={selected === edge.id}
            onClick={() => choose(edge.id)}
          >
            <span>
              {nodes.get(edge.source)?.label}
              <span className="block py-1 text-teal">
                {relationshipLabels[edge.label] ?? edge.label} →
              </span>
              {nodes.get(edge.target)?.label}
            </span>
            <ArrowUpRight className="shrink-0" size={16} />
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
