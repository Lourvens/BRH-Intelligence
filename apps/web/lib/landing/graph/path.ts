import { graphMock } from "./fixtures";
import type { GraphStatus } from "./types";

export function graphPath(
  source: string,
  target: string,
  options: { maxHops?: number; status?: GraphStatus[] } = {},
): { nodeIds: string[]; edgeIds: string[] } | null {
  const maxHops = options.maxHops ?? 4;
  const allowed = new Set(options.status ?? ["documented", "proposed", "validated"]);
  const adjacency = new Map<string, { nodeId: string; edgeId: string }[]>();

  for (const edge of graphMock.edges) {
    if (!allowed.has(edge.status)) continue;
    const from = adjacency.get(edge.source) ?? [];
    from.push({ nodeId: edge.target, edgeId: edge.id });
    adjacency.set(edge.source, from);
    const to = adjacency.get(edge.target) ?? [];
    to.push({ nodeId: edge.source, edgeId: edge.id });
    adjacency.set(edge.target, to);
  }

  if (source === target) return { nodeIds: [source], edgeIds: [] };

  const queue: { nodeId: string; nodeIds: string[]; edgeIds: string[] }[] = [
    { nodeId: source, nodeIds: [source], edgeIds: [] },
  ];
  const seen = new Set([source]);

  while (queue.length) {
    const current = queue.shift();
    if (!current || current.edgeIds.length >= maxHops) continue;
    for (const next of adjacency.get(current.nodeId) ?? []) {
      if (seen.has(next.nodeId)) continue;
      const nodeIds = [...current.nodeIds, next.nodeId];
      const edgeIds = [...current.edgeIds, next.edgeId];
      if (next.nodeId === target) return { nodeIds, edgeIds };
      seen.add(next.nodeId);
      queue.push({ nodeId: next.nodeId, nodeIds, edgeIds });
    }
  }

  return null;
}
