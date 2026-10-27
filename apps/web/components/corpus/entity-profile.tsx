import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Network, Quote, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { entityLabels } from "@/lib/corpus/labels";
import type { Entity, Evidence, GraphResult } from "@/lib/corpus/types";
import { EvidenceCard } from "./evidence-card";
import { GraphExplorer } from "./graph-explorer";
import { Reveal } from "./reveal";
export function EntityProfile({
  entity,
  graph,
  passages,
}: {
  entity: Entity;
  graph: GraphResult;
  passages: { items: Evidence[]; truncated: boolean };
  query: Record<string, string>;
}) {
  return (
    <div className="atlas-page">
      <Link
        href="/brh-corpus/entities"
        className="mb-6 flex min-h-11 items-center gap-2 text-small text-teal"
      >
        <ArrowLeft size={16} />
        Toutes les entités
      </Link>
      <Reveal>
        <header className="atlas-entity-hero">
          <div>
            <p className="atlas-kicker">
              {entityLabels[entity.kind] ?? entity.kind}
            </p>
            <h1>{entity.label}</h1>
            <div className="mt-5 flex flex-wrap gap-4 text-small text-ink-muted">
              <span className="flex items-center gap-2">
                <Files size={16} />
                {entity.document_count} documents
              </span>
              <span className="flex items-center gap-2">
                <Quote size={16} />
                {entity.mention_count} mentions
              </span>
            </div>
            {entity.aliases.length > 0 && (
              <p className="mt-4 text-caption text-ink-muted">
                Aussi rencontré sous : {entity.aliases.join(" · ")}
              </p>
            )}
          </div>
          <Button asChild className="h-12 rounded-xl">
            <Link href={`/brh-corpus/graph?focus=entity:${entity.entity_id}`}>
              <Network size={17} />
              Explorer le graphe
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        </header>
      </Reveal>
      <div className="atlas-profile-grid">
        <section className="atlas-discovery">
          <div className="atlas-section-heading">
            <div>
              <p className="atlas-kicker">DANS LES TEXTES</p>
              <h2>Les passages sources</h2>
            </div>
          </div>
          {passages.items.length ? (
            <div className="space-y-5">
              {passages.items.map((e, i) => (
                <EvidenceCard
                  key={`${e.document_id}:${e.page_number}:${i}`}
                  evidence={e}
                />
              ))}
            </div>
          ) : (
            <div className="atlas-empty">
              <Quote size={30} />
              <h3>Aucun passage disponible</h3>
              <p>Essayez un autre document ou une autre entité.</p>
            </div>
          )}
          {passages.truncated && (
            <p className="mt-5 text-caption text-ink-muted">
              Les 100 premiers passages sont affichés.
            </p>
          )}
          <Button asChild variant="outline" className="mt-6 h-11 rounded-xl">
            <Link href={`/brh-corpus?entity_id=${entity.entity_id}`}>
              Voir les publications liées
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        </section>
        <section className="min-w-0">
          <div className="atlas-discovery">
            <p className="atlas-kicker mb-3">LES CONNEXIONS</p>
            <h2 className="mb-5 font-display text-xl font-semibold">
              Autour de cette entité
            </h2>
            <GraphExplorer graph={graph} />
          </div>
        </section>
      </div>
    </div>
  );
}
