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

export type ChartSeries = {
  key: string;
  label: string;
  color: string;
  points: { label: string; value: number }[];
};

export const SERIES_COLORS = [
  // navy-ink is the same navy in light mode and a light blue in dark mode, so
  // the first series stays visible on a dark plot without a second palette.
  "var(--color-navy-ink)",
  "var(--color-azure)",
  "var(--color-gold-ink)",
  "var(--color-purple)",
  "var(--color-teal)",
  "var(--color-steel)",
];

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
    const yKeys = Array.isArray(decision.y) ? decision.y : decision.y ? [decision.y] : [];
    const series = chartSeries(artifact);
    if (
      decision.x &&
      yKeys.length > 0 &&
      keys.has(decision.x) &&
      yKeys.every((key) => keys.has(key)) &&
      series.some((item) => item.points.length > 0)
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

export function chartYKeys(artifact: TableArtifact) {
  const { y } = artifact.decision;
  if (Array.isArray(y)) return y;
  return y ? [y] : [];
}

export function chartSeries(artifact: TableArtifact): ChartSeries[] {
  const { x } = artifact.decision;
  if (!x) return [];

  return chartYKeys(artifact).map((key, index) => {
    const column = artifact.schema.columns.find((item) => item.key === key);
    const points = artifact.schema.rows
      .map((row) => {
        const label = cell(row, x);
        const value = numberCell(row, key);
        if (!label || Number.isNaN(value)) return null;
        return { label, value };
      })
      .filter((point): point is { label: string; value: number } => point != null);

    return {
      key,
      label: column?.label ?? key,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      points,
    };
  });
}

export function chartPoints(artifact: TableArtifact) {
  return chartSeries(artifact)[0]?.points ?? [];
}

export function chartUnit(artifact: TableArtifact) {
  if (artifact.decision.unit) return artifact.decision.unit;
  const yKey = chartYKeys(artifact)[0];
  const y = artifact.schema.columns.find((column) => column.key === yKey);
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
