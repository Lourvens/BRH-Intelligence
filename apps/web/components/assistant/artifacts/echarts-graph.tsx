"use client";

import {
  graphData,
  SERIES_COLORS,
  type GraphViewEdge,
} from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import { cssColor } from "@/lib/echarts";

import { useECharts } from "./use-echarts";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function isLinearChain(edges: GraphViewEdge[]) {
  return (
    edges.length > 0 &&
    edges.every((edge, index) => index === 0 || edge.from === edges[index - 1].to)
  );
}

function buildGraphOption(artifact: TableArtifact) {
  const { nodes, edges } = graphData(artifact);
  if (!nodes.length) return null;

  const navy = cssColor("var(--color-navy)");
  const navyDeep = cssColor("var(--color-navy-deep)");
  const ink = cssColor("var(--color-ink)");
  const muted = cssColor("var(--color-ink-muted)");
  const surface = cssColor("var(--color-surface)");
  const steel = cssColor("var(--color-steel)");
  const palette = SERIES_COLORS.map(cssColor);
  const kinds = [...new Set(nodes.map((node) => node.kind))];
  const linear = nodes.length <= 4 && isLinearChain(edges);

  const data = nodes.map((node, index) => ({
    id: node.id,
    name: node.label,
    kind: node.kind,
    page: node.page,
    category: kinds.indexOf(node.kind),
    symbol: "roundRect" as const,
    x: linear ? 90 + index * 185 : undefined,
    y: linear ? 0 : undefined,
    symbolSize: [148, 48] as [number, number],
    itemStyle: {
      color: surface,
      borderColor: palette[kinds.indexOf(node.kind) % palette.length],
      borderWidth: 3,
      shadowBlur: 6,
      shadowColor: "rgba(11, 23, 41, 0.08)",
    },
  }));

  const paddedData = linear
    ? [
        {
          id: "__pad__",
          name: "",
          x: 0,
          y: 0,
          symbolSize: 0,
          silent: true,
          itemStyle: { opacity: 0 },
          label: { show: false },
          tooltip: { show: false },
        },
        ...data,
      ]
    : data;

  const graphEdges = edges.map((edge) => ({
    source: edge.from,
    target: edge.to,
    relation: edge.label,
    label: {
      show: Boolean(edge.label),
      formatter: edge.label ?? "",
      color: muted,
      fontSize: 9,
      backgroundColor: surface,
      padding: [2, 4] as [number, number],
      borderRadius: 3,
    },
  }));

  return {
    animationDuration: 500,
    textStyle: { fontFamily: "Inter, ui-sans-serif, sans-serif", color: ink },
    aria: {
      enabled: true,
      description: `${artifact.title}. ${nodes.length} nœuds, ${edges.length} relations. Source : ${artifact.source}.`,
    },
    tooltip: {
      trigger: "item" as const,
      backgroundColor: navyDeep,
      borderColor: navy,
      borderWidth: 1,
      textStyle: { color: "#ffffff", fontSize: 11, fontFamily: "Inter, sans-serif" },
      formatter: (params: {
        dataType?: string;
        data?: { name?: string; kind?: string; page?: number; relation?: string };
      }) => {
        if (params.dataType === "edge") {
          return params.data?.relation
            ? `Relation : <strong>${escapeHtml(params.data.relation)}</strong>`
            : "Relation documentaire";
        }
        const node = params.data;
        if (!node?.name) return "";
        return `<strong>${escapeHtml(node.name)}</strong><br/>${escapeHtml(node.kind ?? "Étape")}${
          node.page ? ` · p. ${node.page}` : ""
        }`;
      },
    },
    legend: {
      bottom: 0,
      data: kinds,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 14,
      textStyle: { color: muted, fontSize: 10, fontFamily: "Inter, sans-serif" },
    },
    series: [
      {
        type: "graph" as const,
        layout: linear ? ("none" as const) : ("force" as const),
        data: paddedData,
        edges: graphEdges,
        categories: kinds.map((name, index) => ({
          name,
          itemStyle: { color: palette[index % palette.length] },
        })),
        roam: true,
        draggable: true,
        scaleLimit: { min: 0.6, max: 2.5 },
        edgeSymbol: ["none", "arrow"] as ["none", "arrow"],
        edgeSymbolSize: 7,
        lineStyle: { color: steel, width: 1.5, curveness: 0.08, opacity: 0.8 },
        label: {
          show: true,
          position: "inside" as const,
          color: ink,
          fontSize: 9.5,
          lineHeight: 12,
          width: 138,
          overflow: "break" as const,
          formatter: "{b}",
        },
        emphasis: {
          focus: "adjacency" as const,
          lineStyle: { width: 2.5 },
          itemStyle: { borderWidth: 4, shadowBlur: 12 },
          label: { show: true, width: 140 },
        },
        force: {
          repulsion: 420,
          edgeLength: [140, 190],
          gravity: 0.06,
          layoutAnimation: true,
        },
      },
    ],
  };
}

export function EChartsGraph({
  artifact,
  expanded = false,
}: {
  artifact: TableArtifact;
  expanded?: boolean;
}) {
  const { nodes } = graphData(artifact);
  const ref = useECharts(() => buildGraphOption(artifact), [artifact]);

  if (!nodes.length) return null;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${artifact.title}. Graphe de ${nodes.length} nœuds. Source : ${artifact.source}.`}
      className={
        expanded
          ? "h-[min(64vh,680px)] w-full bg-bg/40"
          : "h-[300px] w-full bg-bg/40"
      }
    />
  );
}
