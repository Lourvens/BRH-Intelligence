import type { GraphNodeType } from "./types";

export const graphPositions: Record<string, { x: number; y: number }> = {
  "doc-bulletin-97": { x: 150, y: 190 },
  "doc-circulaire-cec-10": { x: 580, y: 170 },
  "ent-brh": { x: 365, y: 215 },
  "ent-direction-mae": { x: 285, y: 70 },
  "ent-bnc": { x: 235, y: 345 },
  "ent-cec": { x: 690, y: 290 },
  "ent-socabank": { x: 82, y: 385 },
  "ent-comite-surveillance": { x: 565, y: 400 },
  "ent-loi-2002": { x: 755, y: 95 },
};

export const graphLabels: Record<string, string[]> = {
  "doc-bulletin-97": ["Bulletin 97", "oct.–déc. 2015"],
  "doc-circulaire-cec-10": ["Circulaire #10", "gouvernance CEC"],
  "ent-direction-mae": ["Direction Monnaie", "& Analyse Éco."],
  "ent-bnc": ["Banque Nationale", "de Crédit"],
  "ent-comite-surveillance": ["Comité de", "surveillance"],
  "ent-loi-2002": ["Loi du", "26 juin 2002"],
};

export const GRAPH_VIEWBOX = "0 0 850 470";
export const GRAPH_TRANSFORM_ORIGIN = "425px 235px";

export const GRAPH_DOCUMENT_GEOMETRY = {
  halfWidth: 70,
  halfHeight: 30,
  width: 140,
  height: 60,
  radius: 13,
} as const;

export const GRAPH_INSTITUTION_RADIUS = 34;
export const GRAPH_INSTITUTION_HUB_RADIUS = 43;

export const GRAPH_REGULATION_GEOMETRY = {
  halfWidth: 43,
  shoulderX: 22,
  shoulderY: 35,
} as const;

export function graphNodeTypeLabel(type: GraphNodeType): string {
  return type === "document"
    ? "Document"
    : type === "regulation"
      ? "Régulation"
      : "Institution";
}
