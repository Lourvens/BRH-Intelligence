import { BarChart3, ChartLine, ChartNoAxesColumn } from "lucide-react";

import { chartPoints, chartUnit } from "@/lib/chat/decision";
import type { ChartType, TableArtifact } from "@/lib/chat/types";

const WIDTH = 420;
const HEIGHT = 190;
const PAD = { top: 20, right: 16, bottom: 28, left: 40 };

function format(value: number, unit: string) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value)} ${unit}`.trim();
}

function iconFor(type: ChartType) {
  if (type === "bar") return ChartNoAxesColumn;
  if (type === "area") return BarChart3;
  return ChartLine;
}

export function ChartArtifactCard({ artifact }: { artifact: TableArtifact }) {
  const points = chartPoints(artifact);
  if (!points.length) return null;

  const unit = chartUnit(artifact);
  const chartType = artifact.decision.chartType ?? "line";
  const Icon = iconFor(chartType);
  const values = points.map((point) => point.value);
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const min = chartType === "bar" ? 0 : rawMin;
  const max = chartType === "bar" ? Math.max(rawMax * 1.1, 1) : rawMax;
  const spread = max - min || 1;
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const baseline = HEIGHT - PAD.bottom;
  const positions = points.map((point, index) => ({
    ...point,
    x:
      PAD.left +
      (points.length === 1
        ? plotWidth / 2
        : (index / (points.length - 1)) * plotWidth),
    y: PAD.top + ((max - point.value) / spread) * plotHeight,
  }));
  const path = positions
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const last = positions.at(-1);
  const grid = [max, (max + min) / 2, min];
  const labelIndexes = [0, Math.floor(positions.length / 2), positions.length - 1];
  const barWidth = Math.min(28, (plotWidth / positions.length) * 0.58);

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
          {chartType === "bar" ? "Barres" : chartType === "area" ? "Aire" : "Courbe"}
        </span>
      </div>

      <div className="bg-bg/40 p-2.5">
        <svg
          role="img"
          aria-label={`${artifact.title}. ${points
            .map((point) => `${point.label}: ${format(point.value, unit)}`)
            .join(", ")}.`}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
        >
          {grid.map((value, index) => {
            const y = PAD.top + ((max - value) / spread) * plotHeight;
            return (
              <g key={`${value}-${index}`}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="#E3E9F2"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#5A6B87"
                  fontSize="9"
                >
                  {format(value, unit)}
                </text>
              </g>
            );
          })}

          {chartType === "bar" ? (
            positions.map((point, index) => {
              const height = Math.max(2, baseline - point.y);
              return (
                <rect
                  key={`${point.label}-${index}`}
                  x={point.x - barWidth / 2}
                  y={baseline - height}
                  width={barWidth}
                  height={height}
                  rx="3"
                  fill={index === positions.length - 1 ? "#009CDC" : "#031A71"}
                  opacity={index === positions.length - 1 ? 1 : 0.82}
                />
              );
            })
          ) : (
            <>
              {chartType === "area" ? (
                <path
                  d={`${path} L ${last?.x} ${baseline} L ${positions[0].x} ${baseline} Z`}
                  fill="rgba(0, 156, 220, 0.09)"
                />
              ) : null}
              <path
                d={path}
                fill="none"
                stroke="#031A71"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.25"
              />
              {positions.map((point, index) => (
                <circle
                  key={`${point.label}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={index === positions.length - 1 ? 4 : 2.75}
                  fill={index === positions.length - 1 ? "#009CDC" : "#FFFFFF"}
                  stroke={index === positions.length - 1 ? "#FFFFFF" : "#031A71"}
                  strokeWidth="1.75"
                />
              ))}
            </>
          )}

          {last ? (
            <text
              x={last.x - 4}
              y={last.y - 9}
              textAnchor="end"
              fill="#031A71"
              fontSize="10"
              fontWeight="700"
            >
              {format(last.value, unit)}
            </text>
          ) : null}

          {labelIndexes.map((index) => {
            const point = positions[index];
            if (!point) return null;
            return (
              <text
                key={`${point.label}-${index}`}
                x={point.x}
                y={HEIGHT - 8}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === positions.length - 1
                      ? "end"
                      : "middle"
                }
                fill="#5A6B87"
                fontSize="9"
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="border-t border-border px-3.5 py-2 text-[10px] text-ink-muted">
        Source : {artifact.source}
      </div>
    </figure>
  );
}
