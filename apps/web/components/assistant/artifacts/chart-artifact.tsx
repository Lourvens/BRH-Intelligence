import { chartSeries, chartUnit } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";

import { CartesianChart } from "./cartesian-chart";
import { iconFor, labelFor } from "./chart-utils";
import { PieChartCard } from "./pie-artifact";

export function ChartArtifactCard({ artifact }: { artifact: TableArtifact }) {
  const series = chartSeries(artifact);
  if (!series.length || !series[0].points.length) return null;

  const chartType = artifact.decision.chartType ?? "line";
  if (chartType === "pie" || chartType === "donut") {
    return <PieChartCard artifact={artifact} />;
  }

  const unit = chartUnit(artifact);
  const Icon = iconFor(chartType);

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-border px-3.5 py-3">
        <div>
          <figcaption className="font-display text-caption font-bold text-navy">
            {artifact.title}
          </figcaption>
          <p className="text-[10px] text-ink-muted">{artifact.subtitle}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-azure/20 bg-azure/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal">
          <Icon className="size-3" aria-hidden />
          {labelFor(chartType)}
        </span>
      </div>

      <CartesianChart
        artifact={artifact}
        series={series}
        unit={unit}
        chartType={chartType}
      />

      <div className="border-t border-border px-3.5 py-2 text-[10px] text-ink-muted">
        Source : {artifact.source}
      </div>
    </figure>
  );
}
