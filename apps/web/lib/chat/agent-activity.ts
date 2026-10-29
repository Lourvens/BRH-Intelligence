export const ACTIVITY_LABELS = {
  route_intent: "Compréhension de la demande",
  plan: "Préparation de la recherche",
  validate_plan: "Vérification du plan",
  search: "Consultation des publications",
  assess_coverage: "Évaluation des passages trouvés",
  refine: "Affinement de la recherche",
  draft: "Rédaction de la réponse",
  validate_answer: "Vérification des affirmations",
  respond: "Préparation de la réponse",
  publish: "Réponse prête",
} as const;

export type ActivityStage = keyof typeof ACTIVITY_LABELS;
export type ActivitySource = { title: string; page: number; excerpt: string };
export type AgentActivity = {
  type: "brh.activity";
  turn_id: string;
  id: string;
  stage: ActivityStage;
  status: "running" | "complete" | "error";
  query?: string;
  summary?: string;
  goals?: string[];
  sources?: ActivitySource[];
  result_count?: number;
};

export function parseActivity(value: unknown): AgentActivity | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (item.type !== "brh.activity" || typeof item.turn_id !== "string" ||
      typeof item.id !== "string" || typeof item.stage !== "string" ||
      !Object.hasOwn(ACTIVITY_LABELS, item.stage) ||
      !["running", "complete", "error"].includes(String(item.status))) return null;
  return {
    type: "brh.activity", turn_id: item.turn_id, id: item.id,
    stage: item.stage as ActivityStage, status: item.status as AgentActivity["status"],
    query: typeof item.query === "string" ? item.query.slice(0, 2000) : undefined,
    summary: typeof item.summary === "string" ? item.summary.slice(0, 700) : undefined,
    goals: Array.isArray(item.goals) ? item.goals.filter((g): g is string => typeof g === "string").slice(0, 4) : undefined,
    result_count: typeof item.result_count === "number" ? Math.max(0, item.result_count) : undefined,
    sources: Array.isArray(item.sources) ? item.sources.filter((source): source is ActivitySource =>
      source && typeof source.title === "string" && Number.isInteger(source.page) &&
      typeof source.excerpt === "string").slice(0, 3) : undefined,
  };
}

export function mergeActivity(previous: AgentActivity[], event: AgentActivity): AgentActivity[] {
  if (previous[0] && previous[0].turn_id !== event.turn_id) return previous;
  const index = previous.findIndex((item) => item.id === event.id);
  if (index === -1) return [...previous, event].slice(-48);
  // Replayed start events must not revert a completed operation.
  if (previous[index].status !== "running" && event.status === "running") return previous;
  return previous.map((item, i) => i === index ? { ...item, ...event } : item);
}
