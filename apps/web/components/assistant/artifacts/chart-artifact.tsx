import {
  BarChart3,
  ChartLine,
  ChartNoAxesColumn,
  CircleDot,
} from "lucide-react";

import { chartSeries, chartUnit } from "@/lib/chat/decision";
import type { ChartType, TableArtifact } from "@/lib/chat/types";

import { PieChartCard } from "./pie-artifact";

const WIDTH = 420;
const HEIGHT = 190;
const PAD = { top: 20, right: 16, bottom: 28, left: 40 };
function format(value: number, unit: string) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value)} ${unit}`.trim();
}

function formatTick(value: number, unit: string) {
  if (unit && unit.length <= 2) return format(value, unit);
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function iconFor(type: ChartType) {
  if (type === "bar") return ChartNoAxesColumn;
  if (type === "area") return BarChart3;
  if (type === "scatter") return CircleDot;
  return ChartLine;
}

function labelFor(type: ChartType) {
  if (type === "bar") return "Barres";
  if (type === "area") return "Aire";
  if (type === "scatter") return "Nuage";
  return "Courbe";
}

export function ChartArtifactCard({ artifact }: { artifact: TableArtifact }) {
  const series = chartSeries(artifact);
  const labels = series[0]?.points.map((point) => point.label) ?? [];
  if (!series.length || !labels.length) return null;

  const chartType = artifact.decision.chartType ?? "line";
  if (chartType === "pie" || chartType === "donut") {
    return <PieChartCard artifact={artifact} />;
  }

  const unit = chartUnit(artifact);
  const Icon = iconFor(chartType);
  const allValues = series.flatMap((item) => item.points.map((point) => point.value));
  const rawMax = Math.max(...allValues);
  const rawMin = Math.min(...allValues);
  const min = chartType === "bar" ? 0 : rawMin;
  const max = chartType === "bar" ? Math.max(rawMax * 1.1, 1) : rawMax;
  const spread = max - min || 1;
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const baseline = HEIGHT - PAD.bottom;
  const xFor = (index: number) =>
    PAD.left + (labels.length === 1 ? plotWidth / 2 : (index / (labels.length - 1)) * plotWidth);
  const yFor = (value: number) => PAD.top + ((max - value) / spread) * plotHeight;
  const grid = [max, (max + min) / 2, min];
  const labelIndexes = [0, Math.floor(labels.length / 2), labels.length - 1];
  const categoryWidth = plotWidth / Math.max(labels.length, 1);
  const barWidth = Math.min(16, (categoryWidth * 0.62) / series.length);

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

      <div className="bg-bg/40 p-2.5">
        <svg
          role="img"
          aria-label={`${artifact.title}. ${series
            .map(
              (item) =>
                `${item.label}: ${item.points
                  .map((point) => `${point.label} ${format(point.value, unit)}`)
                  .join(", ")}`,
            )
            .join("; ")}.`}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
        >
          {grid.map((value, index) => {
            const y = yFor(value);
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
                <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#5A6B87" fontSize="9">
                  {formatTick(value, unit)}
                </text>
              </g>
            );
          })}

          {chartType === "bar"
            ? series.map((item, seriesIndex) =>
                item.points.map((point, index) => {
                  const height = Math.max(2, baseline - yFor(point.value));
                  const groupX = PAD.left + (index + 0.5) * categoryWidth;
                  const offset = (seriesIndex - (series.length - 1) / 2) * barWidth;
                  return (
                    <rect
                      key={`${item.key}-${point.label}`}
                      x={groupX + offset - barWidth / 2}
                      y={baseline - height}
                      width={barWidth}
                      height={height}
                      rx="2"
                      fill={item.color}
                      opacity="0.9"
                    />
                  );
                }),
              )
            : null}

          {chartType !== "bar"
            ? series.map((item) => {
                const positions = item.points.map((point, index) => ({
                  ...point,
                  x: xFor(index),
                  y: yFor(point.value),
                }));
                const path = positions
                  .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                  .join(" ");
                const last = positions.at(-1);

                return (
                  <g key={item.key}>
                    {chartType === "area" ? (
                      <path
                        d={`${path} L ${last?.x} ${baseline} L ${positions[0].x} ${baseline} Z`}
                        fill={item.color}
                        fillOpacity="0.08"
                      />
                    ) : null}
                    {chartType !== "scatter" ? (
                      <path
                        d={path}
                        fill="none"
                        stroke={item.color}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.25"
                      />
                    ) : null}
                    {positions.map((point) => (
                      <circle
                        key={`${item.key}-${point.label}`}
                        cx={point.x}
                        cy={point.y}
                        r="3"
                        fill={item.color}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })
            : null}

          {chartType !== "bar" && series.length === 1 && series[0].points.length ? (
            <text
              x={xFor(series[0].points.length - 1) - 4}
              y={yFor(series[0].points.at(-1)?.value ?? 0) - 9}
              textAnchor="end"
              fill="#031A71"
              fontSize="10"
              fontWeight="700"
            >
              {formatTick(series[0].points.at(-1)?.value ?? 0, unit)}
            </text>
          ) : null}

          {chartType === "bar" && series.length === 1
            ? series[0].points.map((point, index) => (
                <text
                  key={`bar-label-${point.label}`}
                  x={PAD.left + (index + 0.5) * categoryWidth}
                  y={yFor(point.value) - 4}
                  textAnchor="middle"
                  fill="#031A71"
                  fontSize="9"
                  fontWeight="700"
                >
                  {formatTick(point.value, unit)}
                </text>
              ))
            : null}

          {labelIndexes.map((index) => (
            <text
              key={`${labels[index]}-${index}`}
              x={xFor(index)}
              y={HEIGHT - 8}
              textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
              fill="#5A6B87"
              fontSize="9"
            >
              {labels[index]}
            </text>
          ))}
        </svg>

        {series.length > 1 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-2 pb-1 pt-1">
            {series.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-1.5 text-[10px] text-ink-muted">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border px-3.5 py-2 text-[10px] text-ink-muted">
        Source : {artifact.source}
      </div>
    </figure>
  );
}
