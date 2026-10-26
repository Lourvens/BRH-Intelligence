import { ArrowUpRight, Network } from "lucide-react";
import Link from "next/link";
import { entityLabels } from "@/lib/corpus/labels";
import type { Entity } from "@/lib/corpus/types";

export function EntityResults({ entities }: { entities: Entity[] }) {
  return <div>
    <h2 className="mb-3 text-small font-semibold text-navy-ink">Entités repérées <span className="font-normal text-ink-muted">· jusqu’à 25 propositions</span></h2>
    {entities.length ? <ul className="divide-y divide-border border-y border-border">{entities.map((entity) => <li key={entity.entity_id} className="py-5">
      <p className="mb-1 text-caption text-ink-muted">{entityLabels[entity.kind]}</p>
      <Link href={`/brh-corpus/entities/${entity.entity_id}`} className="flex items-center gap-2 font-semibold text-navy-ink hover:underline underline-offset-4"><Network className="size-4" aria-hidden />{entity.label}<ArrowUpRight className="size-3.5" aria-hidden /></Link>
      <p className="mt-2 text-caption text-ink-muted">{entity.document_count} documents · {entity.mention_count} mentions · Identités et alias extraits à vérifier dans les sources.</p>
    </li>)}</ul> : <div className="border border-dashed border-border px-6 py-16 text-center">
      <Network className="mx-auto mb-4 size-7 text-ink-muted" aria-hidden />
      <h3 className="font-display text-lg font-semibold text-navy-ink">Aucune entité disponible pour cette recherche</h3>
      <p className="mx-auto mt-2 max-w-md text-small leading-6 text-ink-muted">L’extraction du graphe est distincte de la transcription. Les documents restent accessibles dans les onglets de recherche textuelle.</p>
    </div>}
  </div>;
}
