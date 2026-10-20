import { ChartPie } from "lucide-react";

import { chartSeries, chartUnit } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";

const SLICE_COLORS = [
  "var(--color-navy)",
  "var(--color-azure)",
  "var(--color-gold-ink)",
  "var(--color-purple)",
  "var(--color-teal)",
  "var(--color-steel)",
];

const SIZE = 190;
const CENTER = SIZE / 2;

function polar(radius: number, angle: number) {
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function slicePath(
  outer: number,
  inner: number,
  start: number,
  end: number,
) {
  const large = end - start > Math.PI ? 1 : 0;
  const p1 = polar(outer, start);
  const p2 = polar(outer, end);
  const p3 = polar(inner, end);
  const p4 = polar(inner, start);

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

export function PieChartCard({ artifact }: { artifact: TableArtifact }) {
  const series = chartSeries(artifact)[0];
  const points = series?.points ?? [];
  if (!points.length) return null;

  const unit = chartUnit(artifact);
  const total = points.reduce((sum, point) => sum + Math.max(point.value, 0), 0);
  if (!total) return null;

  const isDonut = artifact.decision.chartType === "donut";
  let angle = -Math.PI / 2;
  const slices = points
    .map((point, index) => {
      const sweep = (Math.max(point.value, 0) / total) * Math.PI * 2;
      const slice = {
        ...point,
        color: SLICE_COLORS[index % SLICE_COLORS.length],
        path: slicePath(isDonut ? 72 : 72, isDonut ? 38 : 0, angle, angle + sweep),
        percent: (point.value / total) * 100,
      };
      angle += sweep;
      return slice;
    })
    .filter((slice) => slice.percent > 0);

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
          <ChartPie className="size-3" aria-hidden />
          {isDonut ? "Donut" : "Camembert"}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 bg-bg/40 p-3 sm:flex-row">
        <svg
          role="img"
          aria-label={`${artifact.title}. ${slices
            .map(
              (slice) =>
                `${slice.label}: ${new Intl.NumberFormat("fr-FR").format(slice.value)} ${unit} (${slice.percent.toFixed(0)} %)`,
            )
            .join(", ")}.`}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-40 shrink-0"
        >
          {slices.map((slice) => (
            <path key={slice.label} d={slice.path} fill={slice.color} stroke="#FFFFFF" strokeWidth="1.5" />
          ))}
          {isDonut ? (
            <>
              <text
                x={CENTER}
                y={CENTER - 2}
                textAnchor="middle"
                fill="#031A71"
                fontSize="17"
                fontWeight="700"
              >
                {new Intl.NumberFormat("fr-FR").format(total)}
              </text>
              <text x={CENTER} y={CENTER + 12} textAnchor="middle" fill="#5A6B87" fontSize="8">
                {unit || "total"}
              </text>
            </>
          ) : null}
        </svg>

        <div className="min-w-0 flex-1 space-y-1.5">
          {slices.map((slice) => (
            <div key={slice.label} className="flex items-center gap-2 text-[10px]">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="min-w-0 flex-1 truncate text-ink">{slice.label}</span>
              <span className="shrink-0 font-mono text-[9px] text-ink-muted">
                {new Intl.NumberFormat("fr-FR").format(slice.value)} · {slice.percent.toFixed(0)} %
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-3.5 py-2 text-[10px] text-ink-muted">
        Source : {artifact.source}
      </div>
    </figure>
  );
}
