import type { ChartSeries } from "@/lib/chat/decision";
import type { ChartType, TableArtifact } from "@/lib/chat/types";

import { format, formatTick } from "./chart-utils";

const WIDTH = 420;
const HEIGHT = 190;
const PAD = { top: 20, right: 16, bottom: 28, left: 40 };

export function CartesianChart({
  artifact,
  series,
  unit,
  chartType,
}: {
  artifact: TableArtifact;
  series: ChartSeries[];
  unit: string;
  chartType: ChartType;
}) {
  const labels = series[0]?.points.map((point) => point.label) ?? [];
  if (!labels.length) return null;

  const allValues = series.flatMap((item) => item.points.map((point) => point.value));
  const rawMax = Math.max(...allValues);
  const rawMin = Math.min(...allValues);
  const zeroBased = chartType === "bar" || rawMin < rawMax * 0.2;
  const min = zeroBased ? 0 : rawMin;
  const max = chartType === "bar" ? Math.max(rawMax * 1.1, 1) : rawMax;
  const spread = max - min || 1;
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const baseline = HEIGHT - PAD.bottom;
  const xFor = (index: number) =>
    PAD.left + (labels.length === 1 ? plotWidth / 2 : (index / (labels.length - 1)) * plotWidth);
  const yFor = (value: number) => PAD.top + ((max - value) / spread) * plotHeight;
  const grid = [max, max - spread * 0.25, max - spread * 0.5, max - spread * 0.75, min];
  const labelIndexes =
    labels.length <= 6
      ? labels.map((_, index) => index)
      : [0, Math.floor(labels.length / 2), labels.length - 1];
  const categoryWidth = plotWidth / Math.max(labels.length, 1);
  const barWidth = Math.min(16, (categoryWidth * 0.62) / series.length);
  const peakIndex = series[0].points.reduce(
    (best, point, index, points) =>
      point.value > points[best].value ? index : best,
    0,
  );
  const peakPoint = series[0].points[peakIndex];
  const peakY = yFor(peakPoint?.value ?? 0);
  const peakX = xFor(peakIndex);
  const peakLabel = `${new Intl.NumberFormat("fr-FR").format(peakPoint?.value ?? 0)}${
    unit.length <= 2 ? ` ${unit}` : ""
  } (Sommet)`;
  const peakWidth = Math.max(74, peakLabel.length * 5.4);
  const peakTop = Math.max(4, peakY - 34);

  return (
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
                strokeDasharray="3 3"
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
                  {chartType === "line" || chartType === "area" ? (
                    <path
                      d={`${path} L ${last?.x} ${baseline} L ${positions[0].x} ${baseline} Z`}
                      fill={item.color}
                      fillOpacity={chartType === "area" ? "0.08" : "0.04"}
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

        {chartType !== "bar" && peakPoint ? (
          <g transform={`translate(${peakX}, ${peakTop})`}>
            <rect x={-peakWidth / 2} y="0" width={peakWidth} height="18" rx="3" fill="#031A71" />
            <text x="0" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="600">
              {peakLabel}
            </text>
            <line x1="0" x2="0" y1="18" y2={peakY - peakTop} stroke="#031A71" strokeWidth="1" strokeDasharray="1 1" />
          </g>
        ) : null}
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
  );
}
