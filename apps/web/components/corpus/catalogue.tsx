import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CatalogueData } from "@/lib/corpus/types";
import { numberLabel } from "@/lib/corpus/labels";
import { CorpusCoverage } from "./coverage";
import { DocumentResults } from "./document-results";
import { CorpusSearchForm } from "./search-form";
import { CorpusFilterSidebar } from "./corpus-filter-sidebar";
import { SearchFailure } from "./search-failure";
export function CorpusCatalogue({ data }: { data: CatalogueData }) {
  return (
    <div className="atlas-page">
      <header className="corpus-workspace-heading">
        <div>
          <h1>Bibliothèque documentaire</h1>
          <p>
            Recherchez une publication de la BRH, puis lisez-la dans son
            contexte.
          </p>
        </div>
        <div className="corpus-workspace-summary">
          {data.stats && (
            <span>
              {numberLabel(data.stats.readable_documents)} documents disponibles
            </span>
          )}
          <Link href="/brh-corpus/graph">
            Explorer les connexions <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
      </header>
      <section
        className="atlas-discovery"
        aria-label="Recherche et publications"
      >
        <h2 className="sr-only">Rechercher dans les publications</h2>
        <CorpusSearchForm
          key={new URLSearchParams(data.query).toString()}
          query={data.query}
          facets={data.facets}
        />
        <div className="atlas-catalogue-body">
          <CorpusFilterSidebar
            key={new URLSearchParams(data.query).toString()}
            query={data.query}
            facets={data.facets}
          />
          {data.searchError ? (
            <SearchFailure semantic={data.searchError === "semantic"} />
          ) : (
            <DocumentResults documents={data.documents} query={data.query} />
          )}
        </div>
      </section>
      <nav className="corpus-related-navigation" aria-label="Autres recherches">
        <Link href="/brh-corpus/entities">
          Parcourir les entités <ArrowUpRight size={16} aria-hidden />
        </Link>
        <Link href="/brh-corpus/graph">
          Explorer le graphe <ArrowUpRight size={16} aria-hidden />
        </Link>
      </nav>
      <details className="atlas-coverage">
        <summary>À propos du corpus et de sa couverture</summary>
        {data.stats ? (
          <CorpusCoverage stats={data.stats} />
        ) : (
          <p>
            Mesures de couverture temporairement indisponibles. Les documents
            restent consultables.
          </p>
        )}
      </details>
    </div>
  );
}
