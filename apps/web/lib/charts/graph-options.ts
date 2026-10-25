import { graphData } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import type { ChartColors } from "./options";

type GraphColors = ChartColors & { steel: string };

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

export function buildGraphOption(artifact: TableArtifact, colors: GraphColors, reduceMotion: boolean) {
  const { nodes, edges } = graphData(artifact);
  if (!nodes.length) return null;

  const { ink, muted, border, surface, steel, palette } = colors;
  const kinds = [...new Set(nodes.map((node) => node.kind))];
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }

  const data = nodes.map((node) => ({
    id: node.id,
    name: node.label,
    kind: node.kind,
    page: node.page,
    category: kinds.indexOf(node.kind),
    symbol: "circle" as const,
    symbolSize: 18 + Math.min((degree.get(node.id) ?? 1) * 4, 18),
    itemStyle: {
      color: palette[kinds.indexOf(node.kind) % palette.length],
      borderColor: surface,
      borderWidth: 2,
      shadowBlur: 0,
    },
  }));

  const graphEdges = edges.map((edge) => ({
    source: edge.from,
    target: edge.to,
    relation: edge.label,
    label: {
      show: Boolean(edge.label),
      formatter: edge.label ?? "",
      color: muted,
      fontSize: 11,
      backgroundColor: surface,
      padding: [2, 4] as [number, number],
      borderRadius: 3,
    },
  }));

  return {
    animation: !reduceMotion,
    animationDuration: 200,
    textStyle: { fontFamily: "Inter, ui-sans-serif, sans-serif", color: ink },
    aria: {
      enabled: true,
      description: `${artifact.title}. ${nodes.length} nœuds, ${edges.length} relations. Source : ${artifact.source}.`,
    },
    tooltip: {
      trigger: "item" as const,
      backgroundColor: surface,
      borderColor: border,
      borderWidth: 1,
      confine: true,
      extraCssText: "box-shadow:none;border-radius:2px;",
      textStyle: {
        color: ink,
        fontSize: 11,
        fontFamily: "Inter, sans-serif",
      },
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
      textStyle: { color: muted, fontSize: 11, fontFamily: "Inter, sans-serif" },
    },
    series: [
      {
        type: "graph" as const,
        layout: "force" as const,
        data,
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
          position: "bottom" as const,
          distance: 8,
          color: ink,
          fontSize: 11,
          lineHeight: 15,
          width: 132,
          overflow: "break" as const,
          formatter: "{b}",
        },
        emphasis: {
          focus: "adjacency" as const,
          lineStyle: { width: 2.5 },
          itemStyle: { borderWidth: 4, shadowBlur: 0 },
          label: { show: true, width: 140 },
        },
        force: {
          repulsion: 320,
          edgeLength: [110, 160],
          gravity: 0.08,
          initLayout: "circular" as const,
          layoutAnimation: !reduceMotion,
        },
      },
    ],
  };
}

