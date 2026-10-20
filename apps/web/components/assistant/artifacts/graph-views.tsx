"use client";

import { GitBranch, Network, Workflow } from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { graphData, SERIES_COLORS } from "@/lib/chat/decision";
import { buildGraphTree } from "@/lib/chat/graph";
import type { TableArtifact } from "@/lib/chat/types";

import { EChartsGraph } from "./echarts-graph";
import { EChartsTree } from "./echarts-tree";
import { MermaidGraph } from "./mermaid-graph";

function GraphLegend({ kinds }: { kinds: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-border px-3.5 py-1.5 text-[9px] text-ink-muted">
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
  const [view, setView] = useState(tree ? "tree" : "network");

  return (
    <Tabs value={view} onValueChange={setView} className="gap-0">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2">
        <TabsList className="h-7 rounded-lg bg-surface-alt p-0.5">
          {tree ? (
            <TabsTrigger
              value="tree"
              className="gap-1 px-2 text-[10px] data-[state=active]:bg-surface"
            >
              <GitBranch className="size-3" aria-hidden />
              Arbre
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="network"
            className="gap-1 px-2 text-[10px] data-[state=active]:bg-surface"
          >
            <Network className="size-3" aria-hidden />
            Réseau
          </TabsTrigger>
          <TabsTrigger
            value="diagram"
            className="gap-1 px-2 text-[10px] data-[state=active]:bg-surface"
          >
            <Workflow className="size-3" aria-hidden />
            Diagramme
          </TabsTrigger>
        </TabsList>
        <span className="hidden text-[9px] text-ink-muted sm:block">
          {nodes.length} nœuds · {edges.length} relations
        </span>
      </div>

      <GraphLegend kinds={kinds} />

      {tree ? (
        <TabsContent value="tree" className="mt-0">
          <EChartsTree artifact={artifact} expanded={expanded} />
        </TabsContent>
      ) : null}
      <TabsContent value="network" className="mt-0">
        <EChartsGraph artifact={artifact} expanded={expanded} />
      </TabsContent>
      <TabsContent value="diagram" className="mt-0">
        <MermaidGraph artifact={artifact} expanded={expanded} />
      </TabsContent>
    </Tabs>
  );
}
