"use client";

import { useTheme } from "next-themes";
import { useReducedMotion } from "framer-motion";
import { buildGraphOption } from "@/lib/charts/graph-options";

import { graphData, SERIES_COLORS } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import { cssColor } from "@/lib/echarts";

import { useECharts } from "./use-echarts";

export function EChartsGraph({
  artifact,
  expanded = false,
}: {
  artifact: TableArtifact;
  expanded?: boolean;
}) {
  const { nodes } = graphData(artifact);
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const ref = useECharts(
    () => buildGraphOption(artifact, {
      ink: cssColor("var(--color-ink)"),
      muted: cssColor("var(--color-ink-muted)"),
      border: cssColor("var(--color-border)"),
      surface: cssColor("var(--color-surface)"),
      steel: cssColor("var(--color-steel)"),
      palette: SERIES_COLORS.map(cssColor),
    }, Boolean(reduceMotion)),
    [artifact, resolvedTheme, reduceMotion],
  );

  if (!nodes.length) return null;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${artifact.title}. Graphe de ${nodes.length} nœuds. Source : ${artifact.source}.`}
      className={
        expanded
          ? "h-[min(64vh,680px)] w-full bg-surface"
          : "h-[340px] w-full bg-surface"
      }
    />
  );
}
