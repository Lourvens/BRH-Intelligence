import type { Metadata } from "next";
import { CorpusSearchForm } from "@/components/corpus/search-form";
import { EntityResults } from "@/components/corpus/entity-results";
import { CorpusUnavailable } from "@/components/corpus/unavailable";
import { corpusGet, catalogueQuery } from "@/lib/corpus/server";
import type { Entity, Facets, SearchParams } from "@/lib/corpus/types";
export const metadata: Metadata = { title: "Explorer les entités" };
export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = catalogueQuery(await searchParams);
  delete query.mode;
  let result;
  let facets: Facets = { families: [], years: [] };
  try {
    [result, facets] = await Promise.all([
      corpusGet<{
        items: Entity[];
        total: number;
        page: number;
        page_size: number;
      }>(`entities?${new URLSearchParams(query)}`),
      corpusGet<Facets>("facets").catch(() => facets),
    ]);
  } catch {}
  return (
    <>
      <div className="atlas-page">
        <header className="atlas-page-intro">
          <p className="atlas-kicker">LES ACTEURS ET LES IDÉES</p>
          <h1>
            Donner un visage
            <br />
            <span>aux connaissances.</span>
          </h1>
          <p>
            Institutions, personnes, lieux et indicateurs : retrouvez ce qui
            traverse les publications.
          </p>
        </header>
        <section className="atlas-discovery">
          <h2 className="mb-6 font-display text-xl font-semibold">
            Répertoire des entités
          </h2>
          <CorpusSearchForm
            key={new URLSearchParams(query).toString()}
            query={query}
            facets={facets}
            entities
          />
          {result ? (
            <EntityResults
              entities={result.items}
              pagination={result}
              query={query}
            />
          ) : (
            <CorpusUnavailable />
          )}
        </section>
      </div>
    </>
  );
}
