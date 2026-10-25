import { graphData } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";

function labelText(value: string) {
  return value.replace(/["<>\n]/g, " ").replace(/\s+/g, " ").trim();
}

export function buildDiagram(
  artifact: TableArtifact,
  colors: string[],
  surface: string,
  ink: string,
  orientation: "TD" | "LR",
) {
  const { nodes, edges } = graphData(artifact);
  const ids = new Map(nodes.map((node, index) => [node.id, `n${index}`]));
  const kinds = [...new Set(nodes.map((node) => node.kind))];
  const lines = [`flowchart ${orientation}`];

  nodes.forEach((node, index) => {
    const meta = [node.kind, node.page ? `p. ${node.page}` : null]
      .filter(Boolean)
      .join(" · ");
    lines.push(`  n${index}["${labelText(node.label)}<br/>${labelText(meta)}"]`);
    lines.push(`  class n${index} kind${kinds.indexOf(node.kind)}`);
  });

  edges.forEach((edge) => {
    const from = ids.get(edge.from);
    const to = ids.get(edge.to);
    if (!from || !to) return;
    const label = edge.label ? `|${labelText(edge.label)}|` : "";
    lines.push(`  ${from} -->${label} ${to}`);
  });

  kinds.forEach((kind, index) => {
    const color = colors[index % colors.length];
    lines.push(
      `  classDef kind${index} fill:${surface},stroke:${color},stroke-width:2px,color:${ink}`,
    );
  });

  return lines.join("\n");
}

