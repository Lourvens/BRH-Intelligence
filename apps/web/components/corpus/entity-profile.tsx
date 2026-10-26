import Link from "next/link";
import { Button } from "@/components/ui/button";
import { entityLabels } from "@/lib/corpus/labels";
import type { Entity, Evidence, GraphResult } from "@/lib/corpus/types";
import { EvidenceCard } from "./evidence-card";
import { GraphExplorer } from "./graph-explorer";
import { GraphFilters } from "./graph-filters";

export function EntityProfile({ entity, graph, passages, query }: {
  entity: Entity; graph: GraphResult; passages: { items: Evidence[]; truncated: boolean }; query: Record<string, string>;
}) {
  const depthLink = (hops: number) => `?${new URLSearchParams({ ...query, hops: String(hops) })}`;
  return <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
    <Link href="/brh-corpus?mode=entities" className="text-caption text-teal hover:underline">← Répertoire des entités</Link>
    <p className="mb-2 mt-7 text-caption uppercase tracking-wider text-teal">{entityLabels[entity.kind]}</p>
    <h1 className="font-display text-3xl font-semibold text-navy-ink">{entity.label}</h1>
    <p className="mt-3 text-small text-ink-muted">{entity.document_count} documents · {entity.mention_count} mentions</p>
    {entity.aliases.length ? <p className="mt-2 text-caption text-ink-muted">Formes rencontrées : {entity.aliases.join(" · ")}</p> : null}
    <div className="my-6 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
      <Button asChild variant="outline" size="sm"><Link href={`/brh-corpus?entity_id=${entity.entity_id}`}>Documents mentionnant cette entité</Link></Button>
      <nav aria-label="Profondeur du graphe" className="flex items-center gap-2 text-caption"><span className="mr-2 text-ink-muted">Profondeur</span>
        {[1, 2].map((depth) => <Button key={depth} asChild size="sm" variant={graph.hops === depth ? "default" : "outline"}><Link href={depthLink(depth)} aria-current={graph.hops === depth ? "page" : undefined}>{depth} lien{depth > 1 ? "s" : ""}</Link></Button>)}
      </nav>
    </div>
    <GraphFilters key={JSON.stringify(query)} query={query} />
    <GraphExplorer graph={graph} key={JSON.stringify([entity.entity_id, query])} />
    <section className="mt-10" aria-label="Passages documentaires">
      <h2 className="mb-4 font-display text-xl font-semibold text-navy-ink">Passages et contexte documentaire</h2>
      <div className="space-y-4">{passages.items.map((evidence, index) => <EvidenceCard key={`${evidence.document_id}:${evidence.page_number}:${index}`} evidence={evidence} />)}</div>
      {passages.truncated ? <p className="mt-4 text-caption text-ink-muted">Les 100 premiers passages sont affichés.</p> : null}
    </section>
  </div>;
}
