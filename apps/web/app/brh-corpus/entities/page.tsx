import type { Metadata } from "next";
import { CorpusSearchForm } from "@/components/corpus/search-form";
import { EntityResults } from "@/components/corpus/entity-results";
import { CorpusUnavailable } from "@/components/corpus/unavailable";
import { CorpusRequestError } from "@/lib/corpus/server";
import { corpusGet, catalogueQuery } from "@/lib/corpus/server";
import type { Entity, Facets, SearchParams } from "@/lib/corpus/types";
import type { CorpusRateLimit } from "@/lib/corpus/rate-limit";
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
  let rateLimit: CorpusRateLimit | null = null;
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
  } catch (error) {
    rateLimit = error instanceof CorpusRequestError ? error.rateLimit : null;
  }
  return (
    <>
      <div className="atlas-page">
        <header className="atlas-page-intro">
          <h1>Répertoire des entités</h1>
          <p>
            Institutions, personnes, lieux et indicateurs : retrouvez ce qui
            traverse les publications.
          </p>
        </header>
        <section className="atlas-discovery">
          <h2 className="sr-only">
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
            <CorpusUnavailable surface="entity" rateLimit={rateLimit} />
          )}
        </section>
      </div>
    </>
  );
}
