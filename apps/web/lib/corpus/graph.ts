import { SERIES_COLORS } from "@/lib/chat/decision";
import { buildGraphTree } from "@/lib/chat/graph";
import type { TableArtifact } from "@/lib/chat/types";
import { cssColor } from "@/lib/echarts";
import { relationshipLabels } from "./labels";
import type { GraphResult } from "./types";

export function researchTree(graph: GraphResult) {
  return buildGraphTree(graph.nodes.map((node) => ({ id: node.entity_id, label: node.label, kind: node.kind })),
    graph.edges.map((edge) => ({ from: edge.subject_id, to: edge.object_id, label: edge.predicate })));
}

export function graphArtifact(graph: GraphResult): TableArtifact {
  const byId = new Map(graph.nodes.map((node) => [node.entity_id, node]));
  return {
    id: "research-graph", type: "table", title: "Relations documentées", subtitle: "Relations extraites avec preuve de page",
    source: "Publications BRH · passages OCR cités", schema: {
      columns: [
        { key: "subject", label: "Entité source", type: "string", role: "edge-source" },
        { key: "object", label: "Entité cible", type: "string", role: "edge-target" },
        { key: "relation", label: "Relation", type: "string", role: "label" },
        { key: "subjectKind", label: "Type source", type: "string" },
        { key: "objectKind", label: "Type cible", type: "string" },
      ],
      rows: graph.edges.map((edge) => ({
        // IDs keep entities with identical display labels distinct in diagrams.
        subject: `${byId.get(edge.subject_id)?.label ?? "Entité"} · ${edge.subject_id.slice(0, 8)}`,
        object: `${byId.get(edge.object_id)?.label ?? "Entité"} · ${edge.object_id.slice(0, 8)}`,
        relation: relationshipLabels[edge.predicate] ?? edge.predicate,
        subjectKind: byId.get(edge.subject_id)?.kind ?? "", objectKind: byId.get(edge.object_id)?.kind ?? "",
      })),
    },
    decision: { blockType: "graph", graph: { source: "subject", target: "object", label: "relation", sourceKind: "subjectKind", targetKind: "objectKind" } },
  };
}

export function researchGraphOption(graph: GraphResult, reduceMotion: boolean) {
  const kinds = [...new Set(graph.nodes.map((node) => node.kind))];
  return {
    animation: !reduceMotion, backgroundColor: cssColor("var(--color-surface)"),
    aria: { enabled: true, description: "Graphe de relations extraites. La liste des relations et leurs preuves est disponible sous le graphique." },
    tooltip: { show: false },
    series: [{ type: "graph", layout: "force", roam: true, draggable: false,
      force: { repulsion: 350, edgeLength: [100, 200], layoutAnimation: !reduceMotion },
      label: { show: true, color: cssColor("var(--color-ink)"), fontFamily: "Inter", fontSize: 12, width: 150, overflow: "truncate" },
      edgeSymbol: ["none", "arrow"], edgeSymbolSize: 7,
      lineStyle: { color: cssColor("var(--color-steel)"), opacity: 0.7, curveness: 0.08 },
      emphasis: { focus: "adjacency" },
      data: graph.nodes.map((node) => ({ id: node.entity_id, name: node.label, symbolSize: 28,
        itemStyle: { color: cssColor(SERIES_COLORS[kinds.indexOf(node.kind) % SERIES_COLORS.length]) } })),
      links: graph.edges.map((edge) => ({ id: edge.assertion_id, source: edge.subject_id, target: edge.object_id })),
    }],
  };
}
