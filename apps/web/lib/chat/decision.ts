import type { TableArtifact, TableRow } from "./types";

export type ResolvedBlock = "chart" | "graph" | "table";

export type GraphViewNode = {
  id: string;
  label: string;
  kind: string;
  page?: number;
};

export type GraphViewEdge = {
  from: string;
  to: string;
  label?: string;
};

function keysOf(artifact: TableArtifact) {
  return new Set(artifact.schema.columns.map((column) => column.key));
}

function cell(row: TableRow, key: string | undefined) {
  if (!key) return undefined;
  const value = row[key];
  return value == null ? undefined : String(value);
}

function numberCell(row: TableRow, key: string | undefined) {
  if (!key) return Number.NaN;
  const value = row[key];
  return typeof value === "number" ? value : Number(value);
}

export function resolveArtifactBlock(artifact: TableArtifact): ResolvedBlock {
  const keys = keysOf(artifact);
  const decision = artifact.decision;

  if (decision.blockType === "chart") {
    const points = chartPoints(artifact);
    if (
      decision.x &&
      decision.y &&
      keys.has(decision.x) &&
      keys.has(decision.y) &&
      points.length > 0
    ) {
      return "chart";
    }
  }

  if (decision.blockType === "graph" && decision.graph) {
    const graph = graphData(artifact);
    if (
      keys.has(decision.graph.source) &&
      keys.has(decision.graph.target) &&
      graph.nodes.length > 0
    ) {
      return "graph";
    }
  }

  return "table";
}

export function chartPoints(artifact: TableArtifact) {
  const { x, y } = artifact.decision;
  if (!x || !y) return [];

  return artifact.schema.rows
    .map((row) => {
      const label = cell(row, x);
      const value = numberCell(row, y);
      if (!label || Number.isNaN(value)) return null;
      return { label, value };
    })
    .filter((point): point is { label: string; value: number } => point != null);
}

export function chartUnit(artifact: TableArtifact) {
  if (artifact.decision.unit) return artifact.decision.unit;
  const y = artifact.schema.columns.find(
    (column) => column.key === artifact.decision.y,
  );
  return y?.format === "percent" ? "%" : "";
}

export function graphData(artifact: TableArtifact) {
  const mapping = artifact.decision.graph;
  const nodes: GraphViewNode[] = [];
  const edges: GraphViewEdge[] = [];
  if (!mapping) return { nodes, edges };

  const seen = new Set<string>();

  function addNode(label: string, kind?: string, page?: number) {
    if (seen.has(label)) return;
    seen.add(label);
    nodes.push({
      id: label,
      label,
      kind: kind ?? "Étape",
      page: page && !Number.isNaN(page) ? page : undefined,
    });
  }

  for (const row of artifact.schema.rows) {
    const from = cell(row, mapping.source);
    const to = cell(row, mapping.target);
    if (!from || !to) continue;

    const page = mapping.page ? numberCell(row, mapping.page) : Number.NaN;
    addNode(
      from,
      cell(row, mapping.sourceKind) ?? "Étape",
      Number.isNaN(page) ? undefined : page,
    );
    addNode(
      to,
      cell(row, mapping.targetKind) ?? "Étape",
      Number.isNaN(page) ? undefined : page,
    );
    edges.push({
      from,
      to,
      label: cell(row, mapping.label),
    });
  }

  return { nodes, edges };
}
