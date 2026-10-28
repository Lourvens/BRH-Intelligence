"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ResearchLink } from "./research-link";
import {
  ArrowUpRight,
  X,
  Focus,
  MousePointer2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EvidenceCard } from "./evidence-card";
import { entityLabels, relationshipLabels } from "@/lib/corpus/labels";
import type { AtlasGraph, EvidenceList } from "@/lib/corpus/types";
import { readAtlas } from "./atlas-data";
export function AtlasInspector({
  data,
  selected,
  choose,
  update,
  close,
}: {
  data: AtlasGraph | undefined;
  selected: string;
  choose: (id: string) => void;
  update: (changes: Record<string, string>) => void;
  close: () => void;
}) {
  const reduced = useReducedMotion();
  const [evidencePage, setEvidencePage] = useState(1);
  const node = data?.nodes.find((n) => n.id === selected);
  const edge = data?.edges.find((e) => e.id === selected);
  const evidence = useQuery({
    queryKey: ["atlas-evidence", edge?.id, evidencePage],
    queryFn: ({ signal }) =>
      readAtlas<EvidenceList>(
        `/api/corpus/graph/edges/${encodeURIComponent(edge!.id)}/evidence?page=${evidencePage}&page_size=10`,
        signal,
      ),
    enabled: !!edge,
  });
  const selectedLabel =
    node?.label ?? (edge ? (relationshipLabels[edge.label] ?? edge.label) : "");
  return (
    <ScrollArea className="atlas-inspector-scroll">
      <div className="atlas-graph-inspector">
        <div className="flex items-center justify-between gap-3">
          <p className="atlas-kicker">
            {edge
              ? "LA PREUVE DU LIEN"
              : node
                ? "DANS L’ATLAS"
                : "GUIDE D’EXPLORATION"}
          </p>
          {selected && (
            <Button
              variant="ghost"
              className="h-11 w-11"
              onClick={close}
              aria-label="Fermer la sélection"
            >
              <X size={17} />
            </Button>
          )}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected || "guide"}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {selectedLabel ? (
              <h2>{selectedLabel}</h2>
            ) : (
              <div className="atlas-empty">
                <MousePointer2 size={32} />
                <h3>Suivez votre curiosité.</h3>
                <p>
                  Sélectionnez un document, une entité ou un lien pour découvrir
                  son contexte et ses sources.
                </p>
              </div>
            )}
            {node && (
              <>
                <p className="mb-5 text-small text-ink-muted">
                  {node.kind === "document"
                    ? "Publication"
                    : (entityLabels[node.kind] ?? node.kind)}{" "}
                  · {node.degree} connexions dans le périmètre filtré
                </p>
                <Button
                  className="mb-3 h-11 w-full rounded-xl"
                  onClick={() => update({ focus: node.id, q: "", hops: "1" })}
                >
                  <Focus size={16} />
                  Explorer autour
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="mb-5 h-11 w-full rounded-xl"
                >
                  <ResearchLink
                    href={
                      node.slug
                        ? `/documents/${node.slug}?page=1`
                        : `/brh-corpus/entities/${node.id.split(":")[1]}`
                    }
                  >
                    {node.slug ? "Lire le document" : "Voir les passages"}
                    <ArrowUpRight size={16} />
                  </ResearchLink>
                </Button>
                <p className="atlas-kicker mb-3">CONNEXIONS AFFICHÉES</p>
                {data?.edges
                  .filter((e) => e.source === node.id || e.target === node.id)
                  .map((e) => (
                    <button
                      key={e.id}
                      className="atlas-connection"
                      onClick={() => choose(e.id)}
                    >
                      {
                        data.nodes.find(
                          (n) =>
                            n.id ===
                            (e.source === node.id ? e.target : e.source),
                        )?.label
                      }
                      <span>
                        {e.type === "mention"
                          ? `${e.weight} mentions`
                          : (relationshipLabels[e.label] ?? e.label)}
                        <ArrowRight size={12} />
                      </span>
                    </button>
                  ))}
              </>
            )}
            {edge && (
              <>
                <p className="mb-5 text-small leading-6 text-ink-muted">
                  {edge.type === "mention"
                    ? "Ce document mentionne cette entité. Une mention ne constitue pas une relation factuelle entre deux entités."
                    : "Relation extraite et vérifiée automatiquement. Consultez les passages pour en comprendre le contexte."}
                </p>
                {evidence.isPending ? (
                  <p role="status" className="text-small text-ink-muted">
                    Chargement des sources…
                  </p>
                ) : evidence.isError ? (
                  <div role="alert" className="text-small">
                    <p>Sources indisponibles.</p>
                    <Button
                      variant="outline"
                      onClick={() => evidence.refetch()}
                    >
                      Réessayer
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {evidence.data?.items.map((e, i) => (
                        <div key={i}>
                          {e.temporal_context && (
                            <p className="mb-2 text-caption text-ink-muted">
                              Contexte temporel : {e.temporal_context}
                            </p>
                          )}
                          <EvidenceCard evidence={e} />
                        </div>
                      ))}
                    </div>
                    {evidence.data?.items.length === 0 && (
                      <p className="text-small text-ink-muted">
                        Cette preuve n’est plus disponible dans la version
                        publiée.
                      </p>
                    )}
                    {evidence.data && evidence.data.total > 10 && (
                      <div className="mt-5 flex items-center justify-between">
                        <Button
                          aria-label="Preuves précédentes"
                          variant="outline"
                          disabled={evidencePage === 1}
                          onClick={() => setEvidencePage((p) => p - 1)}
                        >
                          <ArrowLeft size={16} />
                        </Button>
                        <span className="text-caption">
                          {evidencePage} / {Math.ceil(evidence.data.total / 10)}
                        </span>
                        <Button
                          aria-label="Preuves suivantes"
                          variant="outline"
                          disabled={evidencePage * 10 >= evidence.data.total}
                          onClick={() => setEvidencePage((p) => p + 1)}
                        >
                          <ArrowRight size={16} />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {!selected && (
              <div className="space-y-4 border-t border-border pt-5 text-caption leading-6 text-ink-muted">
                <p>
                  <strong className="text-ink">Documents et entités</strong>
                  <br />
                  Les traits pointillés indiquent les mentions dans les
                  publications.
                </p>
                <p>
                  <strong className="text-ink">Relations</strong>
                  <br />
                  Les flèches relient les entités par des assertions
                  documentées.
                </p>
                <p>
                  La taille d’un nœud reflète ses connexions dans la vue. Les
                  entités de même nom peuvent avoir des identités distinctes.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
