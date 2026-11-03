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
