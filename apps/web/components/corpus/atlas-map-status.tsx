"use client";

import { LoaderCircle } from "lucide-react";
import type { AtlasGraph } from "@/lib/corpus/types";

export function AtlasMapStatus({
  fetching,
  data,
}: {
  fetching: boolean;
  data: AtlasGraph | undefined;
}) {
  return (
    <div className="atlas-map-status" role="status" aria-live="polite">
      {fetching && (
        <LoaderCircle size={13} className="animate-spin shrink-0" />
      )}
      <span>
        {data
          ? `${data.displayed_nodes} / ${data.matching_nodes} nœuds · ${data.displayed_edges} / ${data.matching_edges} liens`
          : "Carte des connaissances BRH"}
        {data?.truncated && (
          <small>Vue partielle · Affinez ou explorez autour d’un nœud.</small>
        )}
      </span>
    </div>
  );
}
