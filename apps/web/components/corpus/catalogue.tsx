import Link from "next/link";
import { SearchFailure } from "./search-failure";
import { ArrowUpRight, BookOpen, Network, Sparkles } from "lucide-react";
import type { CatalogueData } from "@/lib/corpus/types";
import { numberLabel } from "@/lib/corpus/labels";
import { CorpusCoverage } from "./coverage";
import { DocumentResults } from "./document-results";
import { CorpusSearchForm, CorpusFilterSidebar } from "./search-form";
import { Reveal } from "./reveal";
export function CorpusCatalogue({ data }: { data: CatalogueData }) {
  const searched = Boolean(
    data.query.q ||
      data.query.family ||
      data.query.year ||
      data.query.entity_id ||
      data.query.document_id,
  );
  return (
    <div className="atlas-page">
      <Reveal>
        <section
          className={`atlas-hero ${searched ? "is-compact" : ""}`}
          aria-labelledby="atlas-title"
        >
          <div className="atlas-orbit" aria-hidden />
          <div className="relative z-10 max-w-2xl">
            <p className="atlas-eyebrow">
              <span /> LA MÉMOIRE ÉCONOMIQUE D’HAÏTI
            </p>
            <h1 id="atlas-title">
              Les publications.
              <br />
              <span>Les idées. Les liens.</span>
            </h1>
            <p className="atlas-hero-description">
              Explorez les publications de la BRH. Retrouvez un passage, ouvrez
              sa source, suivez ses connexions.
            </p>
            <div className="atlas-hero-footer">
              <span>
                <BookOpen size={16} />
                {data.stats
                  ? `${numberLabel(data.stats.readable_documents)} documents`
                  : "Le savoir, à la source"}
              </span>
              <Link href="/brh-corpus/graph">
                Explorer le graphe <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
      <section
        className="atlas-discovery"
        aria-label="Recherche et publications"
      >
        <div className="atlas-section-heading">
          <div>
            <p className="atlas-kicker">VOTRE POINT DE DÉPART</p>
            <h2>Bibliothèque documentaire</h2>
          </div>
          <span className="atlas-section-symbol" aria-hidden>
            <Sparkles size={21} />
          </span>
        </div>
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
      <div className="atlas-footer-grid">
        <Link href="/brh-corpus/entities" className="atlas-explore-card">
          <span className="atlas-kicker">UNE AUTRE FAÇON DE CHERCHER</span>
          <h3>
            Qui ? Quoi ? Où ? <ArrowUpRight size={22} />
          </h3>
          <p>
            Parcourez les institutions, les personnes et les indicateurs
            présents dans les textes.
          </p>
        </Link>
        <Link href="/brh-corpus/graph" className="atlas-explore-card">
          <Network size={24} />
          <h3>
            Relier les connaissances <ArrowUpRight size={22} />
          </h3>
          <p>Du document à l’entité, de la relation à sa preuve.</p>
        </Link>
      </div>
      <details className="atlas-coverage">
        <summary>À propos du corpus et de sa couverture</summary>
        {data.stats ? (
          <CorpusCoverage stats={data.stats} />
        ) : (
          <p className="p-4 text-small text-ink-muted">
            Mesures de couverture temporairement indisponibles. Les documents
            restent consultables.
          </p>
        )}
      </details>
    </div>
  );
}
