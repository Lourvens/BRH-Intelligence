"use client";

import { motion, useReducedMotion } from "framer-motion";

import { DrawPath } from "@/components/motion/draw-path";
import { corpus, inflationSeries } from "@/lib/content/home";

const W = 520;
const H = 220;
const PAD = { top: 24, right: 30, bottom: 34, left: 38 };
const MIN = 18;
const MAX = 44;

const x = (index: number) =>
  PAD.left + (index / (inflationSeries.length - 1)) * (W - PAD.left - PAD.right);

const y = (value: number) =>
  PAD.top + (1 - (value - MIN) / (MAX - MIN)) * (H - PAD.top - PAD.bottom);

const line = inflationSeries
  .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`)
  .join(" ");

const area = `${line} L${x(inflationSeries.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`;

const grid = [20, 30, 40];
const axisLabels = [0, 2, 4, 7];

/**
 * A real series from the November 2025 inflation note. One navy line, one
 * highlighted final point, horizontal gridlines only — the DESIGN.md rules.
 */
export function InflationChart() {
  const reduce = useReducedMotion();
  const last = inflationSeries.length - 1;

  return (
    <figure>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-small font-semibold text-navy">
            {corpus.chartTitle}
          </h3>
          <p className="mt-1 text-micro text-ink-muted">
            {corpus.chartSubtitle}
          </p>
        </div>
        <span className="rounded-full bg-surface-alt px-2.5 py-1 text-micro font-medium text-ink-muted">
          en&nbsp;%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-5 h-auto w-full overflow-visible"
        aria-hidden="true"
        focusable="false"
      >
        {grid.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(value) + 3}
              textAnchor="end"
              className="fill-ink-muted text-[11px]"
            >
              {value}
            </text>
          </g>
        ))}

        <motion.path
          d={area}
          fill="var(--color-navy)"
          initial={reduce ? { opacity: 0.06 } : { opacity: 0 }}
          whileInView={{ opacity: 0.06 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, delay: 0.35 }}
        />

        <DrawPath
          d={line}
          className="text-navy"
          strokeWidth={2}
          duration={1.1}
          delay={0.1}
        />

        {inflationSeries.map((point, index) => (
          <motion.circle
            key={point.label}
            cx={x(index)}
            cy={y(point.value)}
            r={index === last ? 4.5 : 3}
            fill={
              index === last ? "var(--color-azure)" : "var(--color-navy)"
            }
            stroke="var(--color-surface)"
            strokeWidth={2}
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.3, delay: 0.75 + index * 0.06 }}
          />
        ))}

        {axisLabels.map((index) => (
          <text
            key={inflationSeries[index].label}
            x={x(index)}
            y={H - 10}
            textAnchor="middle"
            className="fill-ink-muted text-[11px]"
          >
            {inflationSeries[index].label}
          </text>
        ))}

        <text
          x={x(last)}
          y={y(inflationSeries[last].value) - 12}
          textAnchor="end"
          className="fill-navy font-display text-[13px] font-semibold"
        >
          28,3&nbsp;%
        </text>
      </svg>

      <figcaption className="mt-4 border-t border-border pt-3 text-micro text-ink-muted">
        <span className="sr-only">{corpus.chartSummary}</span>
        <span aria-hidden>{corpus.chartSource}</span>
      </figcaption>
    </figure>
  );
}
