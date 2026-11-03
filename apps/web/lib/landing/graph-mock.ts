export type GraphNodeType =
  | "document"
  | "institution"
  | "regulation"
  | "instrument"
  | "indicator"
  | "program"
  | "place"
  | "person";

export type GraphStatus = "documented" | "proposed" | "validated";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  kind?: string;
  family?: string;
  slug?: string;
  sourceTitle?: string;
  pages?: number;
  preview?: boolean;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  predicate: string;
  label: string;
  status: GraphStatus;
  probability?: number;
  page: number;
  quote: string;
  sourceTitle?: string;
  preview?: boolean;
};

export type GraphState = {
  meta: {
    snapshot: string;
    documents: number;
    pages: number;
    entities: number;
    mentions: number;
    relations: { pending: number; accepted: number };
    source: string;
    disclaimer: string;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export const graphMock: GraphState = {
  meta: {
    snapshot: "2026-10-31",
    documents: 1075,
    pages: 15428,
    entities: 2281,
    mentions: 2884,
    relations: { pending: 344, accepted: 0 },
    source: "corpus.research_mentions + corpus.research_assertions",
    disclaimer:
      "Aperçu exploratoire. Les mentions sont documentées ; les relations proposées restent à vérifier.",
  },
  nodes: [
    {
      id: "doc-bulletin-97",
      type: "document",
      label: "Bulletin 97 (oct.–déc. 2015)",
      family: "bulletin",
      slug: "0b524231fbbb32df30bc54b9fb90a26f075d9f5c4c99a01cd52c70734ac03439",
      pages: 21,
      preview: true,
    },
    {
      id: "doc-circulaire-cec-10",
      type: "document",
      label: "Circulaire # 10 — bonne gouvernance des CEC",
      family: "circular",
      slug: "01884737c9a63a4e46779b39a718b67533aaa628b9f9aa58f146fb57ea0174be",
      pages: 13,
      preview: true,
    },
    {
      id: "doc-note-polmon-2022",
      type: "document",
      label: "Note de politique monétaire — 2022",
      sourceTitle: "note_polmon1t22",
      family: "unknown",
      slug: "note-polmon1t22",
      pages: 14,
      preview: false,
    },
    {
      id: "ent-brh",
      type: "institution",
      label: "BRH",
      kind: "institution",
      preview: true,
    },
    {
      id: "ent-direction-mae",
      type: "institution",
      label: "Direction Monnaie et Analyse Économique",
      kind: "institution",
      preview: true,
    },
    {
      id: "ent-bnc",
      type: "institution",
      label: "Banque Nationale de Crédit",
      kind: "institution",
      preview: true,
    },
    {
      id: "ent-cec",
      type: "institution",
      label: "CEC",
      kind: "institution",
      preview: true,
    },
    {
      id: "ent-socabank",
      type: "institution",
      label: "Socabank",
      kind: "institution",
      preview: true,
    },
    {
      id: "ent-comite-surveillance",
      type: "institution",
      label: "Comité de surveillance",
      kind: "institution",
      preview: true,
    },
    {
      id: "ent-systeme-bancaire",
      type: "institution",
      label: "Système bancaire",
      kind: "institution",
      preview: false,
    },
    {
      id: "ent-bons-brh",
      type: "instrument",
      label: "Bons BRH",
      kind: "instrument",
      preview: false,
    },
    {
      id: "ent-loi-2002",
      type: "regulation",
      label: "Loi du 26 juin 2002",
      kind: "regulation",
      preview: true,
    },
  ],
  edges: [
    {
      id: "e-bulletin-brh",
      source: "doc-bulletin-97",
      target: "ent-brh",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 4,
      quote:
        "Le taux de référence de la BRH représente une moyenne pondérée des taux de ces marchés.",
      preview: true,
    },
    {
      id: "e-bulletin-mae",
      source: "doc-bulletin-97",
      target: "ent-direction-mae",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 6,
      quote: "Source : Direction Monnaie et Analyse Économique, BRH.",
      preview: true,
    },
    {
      id: "e-bulletin-bnc",
      source: "doc-bulletin-97",
      target: "ent-bnc",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 13,
      quote:
        "A partir de mars 2007, les données de la Socabank n’apparaissent pas dans ce tableau suite à sa prise en charge par la BNC.",
      preview: true,
    },
    {
      id: "e-bulletin-socabank",
      source: "doc-bulletin-97",
      target: "ent-socabank",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 13,
      quote:
        "A partir de mars 2007, les données de la Socabank n’apparaissent pas dans ce tableau suite à sa prise en charge par la BNC.",
      preview: true,
    },
    {
      id: "e-circulaire-cec",
      source: "doc-circulaire-cec-10",
      target: "ent-cec",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 2,
      quote:
        "L’obligation de loyauté, fondée sur une relation de confiance, engage le dirigeant à protéger les intérêts de la CEC en :",
      preview: true,
    },
    {
      id: "e-circulaire-brh",
      source: "doc-circulaire-cec-10",
      target: "ent-brh",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 5,
      quote:
        "la CEC respecte les normes et instructions émanant de la BRH.",
      preview: true,
    },
    {
      id: "e-circulaire-loi",
      source: "doc-circulaire-cec-10",
      target: "ent-loi-2002",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 2,
      quote:
        "Sous réserve des restrictions de l’article 48 de la Loi du 26 juin 2002, le comité est ainsi constitué :",
      preview: true,
    },
    {
      id: "e-bulletin-bons",
      source: "doc-bulletin-97",
      target: "ent-bons-brh",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 11,
      quote: "Bons BRH",
      preview: false,
    },
    {
      id: "e-note-brh",
      source: "doc-note-polmon-2022",
      target: "ent-brh",
      predicate: "mentions",
      label: "mentionne",
      status: "documented",
      page: 3,
      quote:
        "la BRH a poursuivi sa politique de reprise systématique de la liquidité gourdes",
      preview: false,
    },
    {
      id: "e-mae-part-of-brh",
      source: "ent-direction-mae",
      target: "ent-brh",
      predicate: "part_of",
      label: "fait partie de",
      status: "proposed",
      probability: 0.81,
      page: 16,
      quote: "Direction Monnaie et Analyse Économique - BRH",
      sourceTitle: "Table des matières",
      preview: true,
    },
    {
      id: "e-socabank-part-of-bnc",
      source: "ent-socabank",
      target: "ent-bnc",
      predicate: "part_of",
      label: "fait partie de",
      status: "proposed",
      probability: 0.94,
      page: 13,
      quote:
        "A partir de mars 2007, les données de la Socabank n’apparaissent pas dans ce tableau suite à sa prise en charge par la BNC.",
      sourceTitle: "Bulletin 97",
      preview: true,
    },
    {
      id: "e-comite-supervises-cec",
      source: "ent-comite-surveillance",
      target: "ent-cec",
      predicate: "supervises",
      label: "supervise",
      status: "proposed",
      probability: 0.96,
      page: 5,
      quote:
        "Le comité de surveillance a pour fonction de surveiller les opérations de la CEC.",
      sourceTitle: "Circulaire # 10",
      preview: true,
    },
    {
      id: "e-brh-regulates-banking",
      source: "ent-brh",
      target: "ent-systeme-bancaire",
      predicate: "regulates",
      label: "régule",
      status: "proposed",
      probability: 0.99,
      page: 8,
      quote:
        "En tant que régulateur du système bancaire, la BRH a aussi poursuivi son programme",
      sourceTitle: "CONSEIL D’ADMINISTRATION",
      preview: false,
    },
  ],
};

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
