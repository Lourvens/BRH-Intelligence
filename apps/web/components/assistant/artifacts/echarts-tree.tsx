"use client";

import { graphData, SERIES_COLORS } from "@/lib/chat/decision";
import { buildGraphTree, type GraphTreeNode } from "@/lib/chat/graph";
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

type TreeData = {
  name: string;
  kind: string;
  page?: number;
  itemStyle: { color: string; borderColor: string; borderWidth: number };
  children: TreeData[];
};

function treeData(
  branch: GraphTreeNode,
  kinds: string[],
  palette: string[],
  surface: string,
): TreeData {
  return {
    name: branch.node.label,
    kind: branch.node.kind,
    page: branch.node.page,
    itemStyle: {
      color: surface,
      borderColor: palette[kinds.indexOf(branch.node.kind) % palette.length],
      borderWidth: 2,
    },
    children: branch.children.map((child) =>
      treeData(child, kinds, palette, surface),
    ),
  };
}

function buildTreeOption(artifact: TableArtifact) {
  const { nodes, edges } = graphData(artifact);
  const tree = buildGraphTree(nodes, edges);
  if (!tree) return null;

  const navy = cssColor("var(--color-navy)");
  const navyDeep = cssColor("var(--color-navy-deep)");
  const ink = cssColor("var(--color-ink)");
  const surface = cssColor("var(--color-surface)");
  const steel = cssColor("var(--color-steel)");
  const palette = SERIES_COLORS.map(cssColor);
  const kinds = [...new Set(nodes.map((node) => node.kind))];
  const data = treeData(tree.root, kinds, palette, surface);

  return {
    animationDuration: 500,
    animationDurationUpdate: 350,
    textStyle: { fontFamily: "Inter, ui-sans-serif, sans-serif", color: ink },
    aria: {
      enabled: true,
      description: `${artifact.title}. Arbre de ${tree.size} nœuds sur ${tree.depth + 1} niveaux. Source : ${artifact.source}.`,
    },
    tooltip: {
      trigger: "item" as const,
      backgroundColor: navyDeep,
      borderColor: navy,
      borderWidth: 1,
      textStyle: { color: "#ffffff", fontSize: 11, fontFamily: "Inter, sans-serif" },
      formatter: (params: {
        data?: { name?: string; kind?: string; page?: number };
      }) => {
        const node = params.data;
        if (!node?.name) return "";
        return `<strong>${escapeHtml(node.name)}</strong><br/>${escapeHtml(node.kind ?? "Étape")}${
          node.page ? ` · p. ${node.page}` : ""
        }`;
      },
    },
    series: [
      {
        type: "tree" as const,
        data: [data],
        layout: "orthogonal" as const,
        orient: "LR" as const,
        top: 24,
        left: 24,
        bottom: 24,
        right: 24,
        symbol: "roundRect" as const,
        symbolSize: [160, 46] as [number, number],
        initialTreeDepth: -1,
        expandAndCollapse: true,
        roam: true,
        scaleLimit: { min: 0.55, max: 2.5 },
        edgeShape: "polyline" as const,
        edgeForkPosition: "50%",
        lineStyle: { color: steel, width: 1.5 },
        label: {
          show: true,
          position: "inside" as const,
          color: ink,
          fontSize: 9.5,
          lineHeight: 12,
          width: 142,
          overflow: "break" as const,
          formatter: "{b}",
        },
        emphasis: {
          focus: "descendant" as const,
          itemStyle: { borderWidth: 4, shadowBlur: 12 },
          label: { show: true },
        },
        blur: {
          itemStyle: { opacity: 0.35 },
          label: { opacity: 0.35 },
        },
      },
    ],
  };
}

export function EChartsTree({
  artifact,
  expanded = false,
}: {
  artifact: TableArtifact;
  expanded?: boolean;
}) {
  const ref = useECharts(() => buildTreeOption(artifact), [artifact]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${artifact.title}. Arbre hiérarchique. Source : ${artifact.source}.`}
      className={
        expanded
          ? "h-[min(64vh,680px)] w-full bg-bg/40"
          : "h-[340px] w-full bg-bg/40"
      }
    />
  );
}
