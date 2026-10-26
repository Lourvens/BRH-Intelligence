import { dateLabel, numberLabel } from "@/lib/corpus/labels";
import type { CorpusStats } from "@/lib/corpus/types";

export function CorpusCoverage({ stats }: { stats: CorpusStats }) {
  const figures = [
    [stats.readable_documents, "documents lisibles"], [stats.readable_pages, "pages"],
    [stats.entities, "entités repérées"], [stats.relationships, "relations vérifiées automatiquement"],
  ] as const;
  return (
    <div className="border-y border-border py-4">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {figures.map(([value, label]) => <div key={label} className="flex items-baseline gap-2">
          <dd className="font-display text-lg font-semibold tabular-nums text-navy-ink">{numberLabel(value)}</dd>
          <dt className="text-caption text-ink-muted">{label}</dt>
        </div>)}
      </dl>
      <p className="mt-2 text-caption text-ink-muted">
        {numberLabel(stats.discovered_urls)} URL recensées · Le texte et le graphe ont des couvertures distinctes.
        {stats.as_of ? ` Synchronisé le ${dateLabel(stats.as_of)}.` : " En attente de la première synchronisation."}
      </p>
      <p className="mt-1 text-caption text-ink-muted">Index sémantique courant : {stats.indexed_documents === null ? "couverture non mesurée" : `${numberLabel(stats.indexed_documents)} documents vérifiés`}. Graphe : {numberLabel(stats.processed_documents)} documents traités.</p>
    </div>
  );
}
