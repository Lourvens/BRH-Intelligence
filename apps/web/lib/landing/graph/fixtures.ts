import { edges } from "./edges";
import { nodes } from "./nodes";
import type { GraphState } from "./types";

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
  nodes,
  edges,
};

export function graphNodeById(id: string) {
  return graphMock.nodes.find((node) => node.id === id);
}
