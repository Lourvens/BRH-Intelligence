import type { TableArtifact } from "./types";

export const inflationChart: TableArtifact = {
  type: "table",
  id: "inflation-series-nov-2025",
  title: "Inflation annuelle en Haïti",
  subtitle: "Novembre 2022 → novembre 2025 · glissement annuel",
  source: "IHSI / BRH · Note mensuelle d’inflation, novembre 2025, p. 3",
  schema: {
    columns: [
      { key: "period", label: "Période", type: "string", role: "dimension" },
      {
        key: "value",
        label: "Inflation annuelle",
        type: "number",
        role: "measure",
        format: "percent",
      },
    ],
    rows: [
      { period: "Nov 2022", value: 40.8 },
      { period: "Mai 2023", value: 40.5 },
      { period: "Nov 2023", value: 22.5 },
      { period: "Mai 2024", value: 28.0 },
      { period: "Nov 2024", value: 29.5 },
      { period: "Mai 2025", value: 29.0 },
      { period: "Sept 2025", value: 31.0 },
      { period: "Nov 2025", value: 28.3 },
    ],
  },
  decision: {
    blockType: "chart",
    chartType: "line",
    x: "period",
    y: "value",
    unit: "%",
  },
};

export const bicGraph: TableArtifact = {
  type: "table",
  id: "bic-institutional-chain",
  title: "Chaîne institutionnelle du BIC",
  subtitle: "Du BCNH au Bureau d’Information sur le Crédit",
  source: "Importance du Bureau de Crédit dans l’Économie · p. 5",
  schema: {
    columns: [
      { key: "from", label: "Étape", type: "string", role: "edge-source" },
      {
        key: "to",
        label: "Étape suivante",
        type: "string",
        role: "edge-target",
      },
      { key: "relation", label: "Relation", type: "string", role: "label" },
      {
        key: "fromKind",
        label: "Type de l’étape",
        type: "category",
        role: "node-kind",
      },
      {
        key: "toKind",
        label: "Type de la cible",
        type: "category",
        role: "node-kind",
      },
      { key: "page", label: "Page", type: "number", role: "page" },
    ],
    rows: [
      {
        from: "BCNH créé en 2005",
        to: "BIC mis en service en avril 2013",
        relation: "devient",
        fromKind: "Institution",
        toKind: "Crédit",
        page: 5,
      },
      {
        from: "BIC mis en service en avril 2013",
        to: "Importance du Bureau de Crédit dans l’Économie",
        relation: "documenté par",
        fromKind: "Crédit",
        toKind: "Source",
        page: 5,
      },
    ],
  },
  decision: {
    blockType: "graph",
    graph: {
      source: "from",
      target: "to",
      label: "relation",
      sourceKind: "fromKind",
      targetKind: "toKind",
      page: "page",
    },
  },
};
