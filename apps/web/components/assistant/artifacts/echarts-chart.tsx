"use client";

import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { SERIES_COLORS } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import { buildChartOption } from "@/lib/charts/options";
import { cssColor } from "@/lib/echarts";
import { useECharts } from "./use-echarts";

export function EChartsChart({ artifact, expanded = false }: {
  artifact: TableArtifact;
  expanded?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const ref = useECharts(() => buildChartOption(artifact, {
    ink: cssColor("var(--color-ink)"),
    muted: cssColor("var(--color-ink-muted)"),
    border: cssColor("var(--color-border)"),
    surface: cssColor("var(--color-surface)"),
    palette: SERIES_COLORS.map(cssColor),
  }, Boolean(reduceMotion)), [artifact, resolvedTheme, reduceMotion]);

  return <div ref={ref} role="img" aria-label={`${artifact.title}. ${artifact.subtitle}. Source : ${artifact.source}.`} className={expanded ? "h-[min(62dvh,680px)] min-h-64 w-full bg-surface" : "h-[300px] w-full bg-surface sm:h-[340px]"} />;
}
