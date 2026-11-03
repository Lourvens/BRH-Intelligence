export type ChatRole = "user" | "assistant";

export type ChatCitation = {
  id: string;
  title: string;
  page: number;
  snippet: string;
  source: string;
  kind: string;
  pdfUrl?: string | null;
};

export type TableColumnType = "string" | "number" | "date" | "category";

export type TableColumn = {
  key: string;
  label: string;
  type: TableColumnType;
  role?: "dimension" | "measure" | "edge-source" | "edge-target" | "label" | "node-kind" | "page";
  format?: "percent" | "integer" | "decimal" | "text";
};

export type TableRow = Record<string, string | number | null>;

export type ChartType = "line" | "bar" | "area" | "pie" | "donut" | "scatter";

export type UIDecision = {
  blockType: "chart" | "graph" | "table";
  chartType?: ChartType;
  x?: string;
  y?: string | string[];
  unit?: string;
  graph?: {
    source: string;
    target: string;
    label?: string;
    sourceKind?: string;
    targetKind?: string;
    page?: string;
  };
};

export type TableArtifact = {
  type: "table";
  id: string;
  title: string;
  subtitle: string;
  source: string;
  schema: {
    columns: TableColumn[];
    rows: TableRow[];
  };
  decision: UIDecision;
};

export type ChatArtifact = TableArtifact;

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: ChatCitation[];
  artifacts?: ChatArtifact[];
  refused?: boolean;
  streaming?: boolean;
  activities?: import("./agent-activity").AgentActivity[];
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  group: "Aujourd’hui" | "Cette semaine";
  messages: ChatMessage[];
};
