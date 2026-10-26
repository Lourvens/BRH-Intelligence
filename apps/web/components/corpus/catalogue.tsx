import type { CatalogueData } from "@/lib/corpus/types";
import { CorpusCoverage } from "./coverage";
import { DocumentResults } from "./document-results";
import { EntityResults } from "./entity-results";
import { CorpusSearchForm } from "./search-form";

export function CorpusCatalogue({ data }: { data: CatalogueData }) {
  return <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
    <p className="mb-3 text-caption font-semibold uppercase tracking-[0.15em] text-teal">Espace de recherche</p>
    <h1 className="font-display text-3xl font-bold tracking-tight text-navy-ink sm:text-4xl">Corpus documentaire</h1>
    <p className="mb-7 mt-3 max-w-2xl font-reading text-base leading-7 text-ink-muted">Lire les publications de la BRH, retrouver un passage et explorer les entités qui les relient. Chaque résultat garde son document et sa page.</p>
    <CorpusCoverage stats={data.stats} />
    <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
      <aside aria-label="Critères de recherche"><CorpusSearchForm key={new URLSearchParams(data.query).toString()} query={data.query} facets={data.facets} /></aside>
      <section aria-label="Résultats">{data.query.mode === "entities" ? <EntityResults entities={data.entities} /> : <DocumentResults documents={data.documents} query={data.query} />}</section>
    </div>
  </div>;
}
