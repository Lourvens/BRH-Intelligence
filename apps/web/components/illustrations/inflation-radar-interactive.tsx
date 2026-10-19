"use client";

import { motion } from "framer-motion";
import { TrendingDown, Calendar, FileCheck } from "lucide-react";
import { useState } from "react";

import { corpus, inflationSeries } from "@/lib/content/home";
import { cn } from "@/lib/utils";

const W = 520;
const H = 220;
const PAD = { top: 28, right: 34, bottom: 38, left: 40 };
const MIN = 18;
const MAX = 44;

const x = (index: number) =>
  PAD.left + (index / (inflationSeries.length - 1)) * (W - PAD.left - PAD.right);

const y = (value: number) =>
  PAD.top + (1 - (value - MIN) / (MAX - MIN)) * (H - PAD.top - PAD.bottom);

const linePath = inflationSeries
  .map(
    (point, index) =>
      `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`,
  )
  .join(" ");

const areaPath = `${linePath} L${x(inflationSeries.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`;

const gridLines = [20, 30, 40];

export function InflationRadarInteractive({ className }: { className?: string }) {
  const [activeIdx, setActiveIdx] = useState<number>(inflationSeries.length - 1);
  const activePoint = inflationSeries[activeIdx] ?? inflationSeries[inflationSeries.length - 1];

  return (
    <figure className={cn("relative flex flex-col justify-between", className)}>
      {/* Header bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-azure animate-pulse" />
            <h3 className="font-display text-small font-bold text-navy sm:text-body">
              {corpus.chartTitle}
            </h3>
          </div>
          <p className="mt-0.5 text-micro text-ink-muted">
            {corpus.chartSubtitle} · Source officielle Note d&apos;inflation BRH
          </p>
        </div>

        {/* Selected Data Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-azure/20 bg-azure/5 px-3 py-1.5 shadow-sm">
          <Calendar className="size-3.5 text-azure" />
          <span className="text-micro font-medium text-ink-muted capitalize">
            {activePoint.label} :
          </span>
          <span className="font-display text-small font-bold tabular-nums text-navy">
            {activePoint.value.toFixed(1).replace(".", ",")}&nbsp;%
          </span>
        </div>
      </div>

      {/* SVG Chart area */}
      <div className="relative mt-4 w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full select-none overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="inflationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-azure)" stopOpacity="0.22" />
              <stop offset="85%" stopColor="var(--color-navy)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Gridlines */}
          {gridLines.map((val) => (
            <g key={val}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(val)}
                y2={y(val)}
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(val) + 3.5}
                textAnchor="end"
                className="fill-ink-muted font-sans text-[10px] tabular-nums"
              >
                {val}%
              </text>
            </g>
          ))}

          {/* Area Fill */}
          <motion.path
            d={areaPath}
            fill="url(#inflationGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />

          {/* Main Line with Stroke Glow */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-navy)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Guide Vertical Line */}
          <line
            x1={x(activeIdx)}
            x2={x(activeIdx)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--color-azure)"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />

          {/* Data Points */}
          {inflationSeries.map((point, idx) => {
            const isCurrent = idx === activeIdx;
            const cx = x(idx);
            const cy = y(point.value);

            return (
              <g
                key={point.label}
                className="cursor-pointer group"
                onClick={() => setActiveIdx(idx)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                {/* Hit area */}
                <circle cx={cx} cy={cy} r={16} fill="transparent" />

                {/* Highlight ring for active point */}
                {isCurrent && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="none"
                    stroke="var(--color-azure)"
                    strokeWidth={2}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.4, 0.8] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                )}

                {/* Core Point Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCurrent ? 5 : 3.5}
                  fill={isCurrent ? "var(--color-azure)" : "var(--color-navy)"}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  className="transition-all duration-200"
                />

                {/* Bottom X-axis labels */}
                {(idx === 0 || idx === 2 || idx === 4 || idx === inflationSeries.length - 1) && (
                  <text
                    x={cx}
                    y={H - 12}
                    textAnchor="middle"
                    className={cn(
                      "font-sans text-[10px] transition-colors",
                      isCurrent
                        ? "fill-navy font-semibold"
                        : "fill-ink-muted",
                    )}
                  >
                    {point.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Floating Data Badge over selected point */}
          <g transform={`translate(${Math.min(Math.max(x(activeIdx), 50), W - 60)}, ${y(activePoint.value) - 22})`}>
            <rect
              x="-26"
              y="-12"
              width="52"
              height="18"
              rx="6"
              fill="var(--color-navy)"
              filter="url(#glowFilter)"
            />
            <text
              x="0"
              y="1"
              textAnchor="middle"
              className="fill-white font-display text-[10.5px] font-bold tabular-nums"
            >
              {activePoint.value.toFixed(1).replace(".", ",")}%
            </text>
          </g>
        </svg>
      </div>

      {/* Summary caption */}
      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-surface-alt/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-micro text-ink">
          <TrendingDown className="size-3.5 text-emerald" />
          <span>
            Baisse globale de <strong>12,5 points</strong> depuis le pic de nov. 2022.
          </span>
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted">
          <FileCheck className="size-3.5 text-azure" />
          Note d&apos;inflation, p.&nbsp;3
        </span>
      </div>

      <figcaption className="mt-2 text-[10.5px] text-ink-muted">
        {corpus.chartSource}
      </figcaption>
    </figure>
  );
}
