"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  FileText,
  LayoutGrid,
  List,
  SearchX,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { ResearchLink } from "./research-link";
import { Button } from "@/components/ui/button";
import { familyLabels, numberLabel } from "@/lib/corpus/labels";
import { corpusLink } from "@/lib/corpus/query";
import type { DocumentList } from "@/lib/corpus/types";
import { Reveal } from "./reveal";
export function DocumentResults({
  documents,
  query,
}: {
  documents: DocumentList;
  query: Record<string, string>;
}) {
  const [grid, setGrid] = useState(false);
  useEffect(() => {
    try {
      setGrid(localStorage.getItem("brh-result-layout") === "grid");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (
        sessionStorage.getItem("brh-research-restore") ===
        location.pathname + location.search
      ) {
        const y = Number(sessionStorage.getItem("brh-research-scroll")) || 0;
        const frame = requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (
              sessionStorage.getItem("brh-research-restore") ===
              location.pathname + location.search
            ) {
              sessionStorage.removeItem("brh-research-restore");
              window.scrollTo(0, y);
            }
          }),
        );
        return () => cancelAnimationFrame(frame);
      }
    } catch {
      /* Storage is optional. */
    }
  }, []);
  const pages = Math.ceil(documents.total / documents.page_size);
  return (
    <div className="mt-7 min-w-0">
      <div className="atlas-result-toolbar">
        <p role="status">
          <strong>{numberLabel(documents.total)}</strong>{" "}
          {documents.total === 1 ? "publication" : "publications"}
          {documents.bounded ? " proposées" : ""}
          <span>
            {documents.bounded
              ? "Sélection sémantique limitée"
              : query.q
                ? `Résultats pour « ${query.q} »`
                : "Le corpus, à votre rythme"}
          </span>
        </p>
        <div
          className="hidden gap-1 rounded-xl border border-border p-1 md:flex"
          aria-label="Présentation des résultats"
        >
          {[
            { value: false, label: "Liste", icon: List },
            { value: true, label: "Grille", icon: LayoutGrid },
          ].map(({ value, label, icon: Icon }) => (
            <Button
              key={label}
              aria-label={label}
              aria-pressed={grid === value}
              variant={grid === value ? "secondary" : "ghost"}
              className="h-10 w-10 rounded-lg"
              onClick={() => {
                setGrid(value);
                try {
                  localStorage.setItem(
                    "brh-result-layout",
                    value ? "grid" : "list",
                  );
                } catch {}
              }}
            >
              <Icon size={17} />
            </Button>
          ))}
        </div>
      </div>
      {documents.items.length ? (
        <ul className={`atlas-results ${grid ? "is-grid" : ""}`}>
          {documents.items.map((doc, index) => (
            <li key={doc.document_id}>
              <Reveal>
                <article className="atlas-document">
                  <div
                    className={`atlas-document-spine spine-${index % 4}`}
                    aria-hidden
                  >
                    <FileText size={23} />
                    <span>
                      {String(
                        (documents.page - 1) * documents.page_size + index + 1,
                      ).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="atlas-document-body">
                    <div className="atlas-document-meta">
                      <span>{familyLabels[doc.family] ?? doc.family}</span>
                      {doc.period_label && <span>{doc.period_label}</span>}
                      <span>{doc.page_count} pages</span>
                    </div>
                    <h3>
                      <ResearchLink
                        href={`/documents/${doc.slug}?page=${doc.match_page ?? 1}`}
                      >
                        {doc.title}
                        <ArrowUpRight size={18} />
                      </ResearchLink>
                    </h3>
                    {doc.snippet && (
                      <p className="atlas-document-snippet">{doc.snippet}</p>
                    )}
                    <div className="atlas-document-actions">
                      <ResearchLink
                        href={`/documents/${doc.slug}?page=${doc.match_page ?? 1}`}
                      >
                        Lire
                        {doc.match_page
                          ? ` la page ${doc.match_page}`
                          : " le document"}
                        <ArrowRight size={14} />
                      </ResearchLink>
                      {doc.source_urls[0] && (
                        <a
                          href={`${doc.source_urls[0]}#page=${doc.match_page ?? 1}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF officiel
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {doc.entity_count > 0 && (
                        <Link
                          href={`/brh-corpus/graph?focus=document:${doc.document_id}`}
                        >
                          {doc.entity_count} entités
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        <div className="atlas-empty">
          <SearchX size={36} />
          <h3>
            {documents.bounded && !query.q
              ? "Une idée, une question ?"
              : "Aucun document pour ces critères"}
          </h3>
          <p>
            {documents.bounded && !query.q
              ? "Saisissez une question pour rechercher par le sens."
              : "Essayez une autre expression ou élargissez les filtres."}
          </p>
          <Button asChild variant="outline">
            <Link href="/brh-corpus">Voir toutes les publications</Link>
          </Button>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination du corpus" className="atlas-pagination">
          <Button asChild variant="outline" disabled={documents.page <= 1}>
            <Link
              aria-disabled={documents.page <= 1}
              tabIndex={documents.page <= 1 ? -1 : undefined}
              href={corpusLink(query, {
                page: Math.max(1, documents.page - 1),
              })}
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Précédente</span>
            </Link>
          </Button>
          <span>
            Page <strong>{documents.page}</strong> sur {pages}
          </span>
          <Button asChild variant="outline" disabled={documents.page >= pages}>
            <Link
              aria-disabled={documents.page >= pages}
              tabIndex={documents.page >= pages ? -1 : undefined}
              href={corpusLink(query, {
                page: Math.min(pages, documents.page + 1),
              })}
            >
              <span className="hidden sm:inline">Suivante</span>
              <ArrowRight size={16} />
            </Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
