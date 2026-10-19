import { openUIVisualRoute } from "@/lib/chat/open-intelligent-ui";
import type { ChatArtifact } from "@/lib/chat/types";

import { ChartArtifactCard } from "./chart-artifact";
import { GraphArtifactCard } from "./graph-artifact";
import { TableArtifactView } from "./table-artifact";

export function Artifact({ artifact }: { artifact: ChatArtifact }) {
  const { block } = openUIVisualRoute(artifact);

  if (block === "chart") {
    return <ChartArtifactCard artifact={artifact} />;
  }

  if (block === "graph") {
    return <GraphArtifactCard artifact={artifact} />;
  }

  return <TableArtifactView artifact={artifact} />;
}
