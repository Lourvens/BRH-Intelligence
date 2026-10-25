"use client";

import { Table2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chartUnit } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import { ArtifactHeader, ArtifactProvenance } from "./artifact-frame";
import { ArtifactTable } from "./artifact-table";
import { iconFor, labelFor } from "./chart-utils";
import { EChartsChart } from "./echarts-chart";
import { ExpandableVisualization } from "./expandable-visualization";

export function ChartArtifactCard({ artifact }: { artifact: TableArtifact }) {
  const chartType = artifact.decision.chartType ?? "line";
  const Icon = iconFor(chartType);
  const unit = chartUnit(artifact);

  return (
    <figure className="min-w-0 overflow-hidden rounded-sm border border-border bg-surface">
      <ArtifactHeader artifact={artifact} icon={Icon} label={labelFor(chartType)} actions={<ExpandableVisualization title={artifact.title} subtitle={artifact.subtitle} source={artifact.source} expanded={<EChartsChart artifact={artifact} expanded />} />} />
      <Tabs defaultValue="chart" className="gap-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4">
          <TabsList variant="line" aria-label={`Présentation de ${artifact.title}`} className="h-11 gap-3 p-0">
            <TabsTrigger value="chart" className="h-11 rounded-none px-0 text-caption shadow-none after:bottom-0 after:bg-navy-ink"><Icon className="size-3.5" aria-hidden /> Graphique</TabsTrigger>
            <TabsTrigger value="data" className="h-11 rounded-none px-0 text-caption shadow-none after:bottom-0 after:bg-navy-ink"><Table2 className="size-3.5" aria-hidden /> Données</TabsTrigger>
          </TabsList>
          {unit ? <span className="py-2 text-caption text-ink-muted">Unité : {unit}</span> : null}
        </div>
        <TabsContent value="chart" className="min-w-0"><EChartsChart artifact={artifact} /></TabsContent>
        <TabsContent value="data" className="min-w-0"><ArtifactTable artifact={artifact} /></TabsContent>
      </Tabs>
      <ArtifactProvenance source={artifact.source} />
    </figure>
  );
}
