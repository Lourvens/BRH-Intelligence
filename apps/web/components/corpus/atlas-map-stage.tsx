"use client";

import type { RefObject } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LoaderCircle, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CorpusRequestError } from "@/lib/corpus/errors";
import { CorpusRateLimitNotice } from "./corpus-rate-limit-notice";
import type { AtlasGraph } from "@/lib/corpus/types";
import { AtlasGraphList } from "./atlas-graph-list";
import type { AtlasControls } from "./atlas-network";

const Canvas = dynamic(() => import("./atlas-network"), {
  ssr: false,
  loading: () => (
    <div className="atlas-map-message" role="status">
      <LoaderCircle className="animate-spin" />
      Préparation de la carte…
    </div>
  ),
});

export function AtlasMapStage({
  data,
  fetching,
  error,
  pending,
  refetch,
  search,
  view,
  list,
  selected,
  choose,
  reset,
  controls,
}: {
  data: AtlasGraph | undefined;
  fetching: boolean;
  error: unknown;
  pending: boolean;
  refetch: () => void;
  search: Pick<URLSearchParams, "get">;
  view: string;
  list: boolean;
  selected: string;
  choose: (id: string) => void;
  reset: () => void;
  controls: RefObject<AtlasControls | null>;
}) {
  const rateLimit = error instanceof CorpusRequestError ? error.rateLimit : null;

  return (
    <div className="atlas-graph-workspace">
      <div className="atlas-graph-stage" aria-busy={fetching}>
        {data && data.nodes.length > 0 && (
          <>
            <div className="atlas-map-canvas" hidden={list}>
              <Canvas
                ref={controls}
                data={data}
                selected={selected}
                onSelect={choose}
              />
            </div>
            {list && (
              <AtlasGraphList
                data={data}
                selected={selected}
                choose={choose}
              />
            )}
          </>
        )}
        {rateLimit ? (
          <CorpusRateLimitNotice
            rateLimit={rateLimit}
            surface="atlas"
            onRetry={refetch}
            secondaryAction={{
              label: "Explorer les publications",
              onClick: () => window.location.assign("/brh-corpus"),
            }}
            className="m-4"
          />
        ) : error ? (
          <div className="atlas-map-message" role="alert">
            <Network size={32} />
            <h2>Le graphe est temporairement indisponible.</h2>
            <p>Vos critères sont conservés. Vous pouvez réessayer.</p>
            <Button onClick={refetch}>Réessayer</Button>
          </div>
        ) : pending ? (
          <div className="atlas-map-message" role="status">
            <LoaderCircle className="animate-spin" />
            <h2>Assemblage des connexions…</h2>
          </div>
        ) : data?.nodes.length === 0 ? (
          <div className="atlas-map-message">
            <Network size={36} />
            <h2>
              {search.get("q") || search.get("focus")
                ? "Aucune connexion pour ces critères"
                : "Les liens se dessinent à partir des sources."}
            </h2>
            <p>
              {view === "relations"
                ? "Aucune relation documentée ne correspond à cette vue. Explorez aussi les mentions dans les publications."
                : "Élargissez les filtres ou revenez à la vue globale."}
            </p>
            <Button variant="outline" onClick={reset}>
              Vue globale
            </Button>
            <Link
              href="/brh-corpus"
              className="text-small text-teal underline"
            >
              Explorer les publications
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
