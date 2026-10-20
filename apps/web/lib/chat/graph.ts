import type { GraphViewEdge, GraphViewNode } from "./decision";

export type GraphTreeNode = {
  node: GraphViewNode;
  children: GraphTreeNode[];
  depth: number;
};

export type GraphTree = {
  root: GraphTreeNode;
  size: number;
  depth: number;
};

/**
 * A graph is a tree when it has one root, every other node has exactly one
 * parent, and it has no cycles. The renderer only uses this for layout; the
 * table remains the source of truth.
 */
export function buildGraphTree(
  nodes: readonly GraphViewNode[],
  edges: readonly GraphViewEdge[],
): GraphTree | null {
  if (!nodes.length || edges.length !== nodes.length - 1) return null;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  const parents = new Map<string, number>();

  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) return null;
    children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
    parents.set(edge.to, (parents.get(edge.to) ?? 0) + 1);
  }

  if ([...parents.values()].some((count) => count !== 1)) return null;

  const roots = nodes.filter((node) => !parents.has(node.id));
  if (roots.length !== 1) return null;

  const seen = new Set<string>();
  let maxDepth = 0;

  function visit(id: string, depth: number): GraphTreeNode | null {
    if (seen.has(id)) return null;
    const node = byId.get(id);
    if (!node) return null;

    seen.add(id);
    maxDepth = Math.max(maxDepth, depth);

    const descendants = (children.get(id) ?? []).map((childId) =>
      visit(childId, depth + 1),
    );
    if (descendants.some((child) => child === null)) return null;

    return {
      node,
      depth,
      children: descendants as GraphTreeNode[],
    };
  }

  const root = visit(roots[0].id, 0);
  if (!root || seen.size !== nodes.length) return null;

  return { root, size: seen.size, depth: maxDepth };
}
