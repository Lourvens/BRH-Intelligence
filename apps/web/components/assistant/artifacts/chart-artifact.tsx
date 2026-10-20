import type { TableArtifact } from "@/lib/chat/types";

import { iconFor, labelFor } from "./chart-utils";
import { EChartsChart } from "./echarts-chart";
import { ExpandableVisualization } from "./expandable-visualization";

export function ChartArtifactCard({ artifact }: { artifact: TableArtifact }) {
  const chartType = artifact.decision.chartType ?? "line";
  const Icon = iconFor(chartType);

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
          <span className="inline-flex items-center gap-1 rounded border border-azure/20 bg-azure/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal">
            <Icon className="size-3" aria-hidden />
            {labelFor(chartType)}
          </span>
          <ExpandableVisualization
            title={artifact.title}
            subtitle={artifact.subtitle}
            source={artifact.source}
            expanded={<EChartsChart artifact={artifact} expanded />}
          />
        </div>
      </div>

      <EChartsChart artifact={artifact} />

      <div className="border-t border-border px-3.5 py-2 text-[10px] text-ink-muted">
        Source : {artifact.source}
      </div>
    </figure>
  );
}
