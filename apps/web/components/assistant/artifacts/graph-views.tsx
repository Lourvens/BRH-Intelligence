"use client";

import { ArrowDown, ArrowRight, Network, Workflow } from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { graphData, SERIES_COLORS } from "@/lib/chat/decision";
import { buildGraphTree } from "@/lib/chat/graph";
import type { TableArtifact } from "@/lib/chat/types";

import { EChartsGraph } from "./echarts-graph";
import { MermaidGraph } from "./mermaid-graph";

function GraphLegend({ kinds }: { kinds: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-border px-3.5 py-1.5 text-[11px] text-ink-muted">
      {kinds.map((kind, index) => (
        <span key={kind} className="inline-flex items-center gap-1">
          <span
            className="size-1.5 rounded-full"
            style={{
              backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length],
            }}
            aria-hidden
          />
          {kind}
        </span>
      ))}
    </div>
  );
}

export function GraphViews({
  artifact,
  expanded = false,
}: {
  artifact: TableArtifact;
  expanded?: boolean;
}) {
  const { nodes, edges } = graphData(artifact);
  const tree = buildGraphTree(nodes, edges);
  const kinds = [...new Set(nodes.map((node) => node.kind))];
  const longDiagram = tree
    ? tree.size >= 6 || tree.depth >= 3
    : nodes.length >= 7;
  const [view, setView] = useState(tree ? "diagram" : "network");
  const [orientation, setOrientation] = useState<"TD" | "LR">(
    longDiagram ? "TD" : "LR",
  );

  return (
    <Tabs value={view} onValueChange={setView} className="gap-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2">
        <TabsList variant="line" className="h-10 gap-3 p-0">
          <TabsTrigger
            value="network"
            className="h-10 gap-1 rounded-none px-0 text-caption shadow-none after:bottom-0"
          >
            <Network className="size-3" aria-hidden />
            Réseau
          </TabsTrigger>
          <TabsTrigger
            value="diagram"
            className="h-10 gap-1 rounded-none px-0 text-caption shadow-none after:bottom-0"
          >
            <Workflow className="size-3" aria-hidden />
            Diagramme
          </TabsTrigger>
        </TabsList>

        {view === "diagram" ? (
          <ToggleGroup
            type="single"
            value={orientation}
            onValueChange={(value) => {
              if (value === "TD" || value === "LR") setOrientation(value);
            }}
            variant="outline"
            size="sm"
            className="h-9 rounded-sm"
            aria-label="Orientation du diagramme"
          >
            <ToggleGroupItem
              value="TD"
              aria-label="Orientation verticale"
              className="h-9 min-w-9 rounded-sm px-1.5 shadow-none"
            >
              <ArrowDown className="size-3" aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="LR"
              aria-label="Orientation horizontale"
              className="h-9 min-w-9 rounded-sm px-1.5 shadow-none"
            >
              <ArrowRight className="size-3" aria-hidden />
            </ToggleGroupItem>
          </ToggleGroup>
        ) : (
          <span className="hidden text-[11px] text-ink-muted sm:block">
            {nodes.length} nœuds · {edges.length} relations
          </span>
        )}
      </div>

      <GraphLegend kinds={kinds} />

      <TabsContent value="network" className="mt-0">
        <EChartsGraph artifact={artifact} expanded={expanded} />
      </TabsContent>
      <TabsContent value="diagram" className="mt-0">
        <MermaidGraph
          artifact={artifact}
          expanded={expanded}
          orientation={orientation}
        />
      </TabsContent>
    </Tabs>
  );
}
