import { ArrowRight, FileText, Network } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { familyLabels, numberLabel } from "@/lib/corpus/labels";
import { corpusLink } from "@/lib/corpus/query";
import type { DocumentList } from "@/lib/corpus/types";

export function DocumentResults({ documents, query }: { documents: DocumentList; query: Record<string, string> }) {
  const pages = Math.ceil(documents.total / documents.page_size);
  return <div className="min-w-0">
    <div role="status" className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-small font-semibold text-navy-ink">{numberLabel(documents.total)} document{documents.total === 1 ? "" : "s"}{documents.bounded ? " proposés" : ""}</h2>
      <span className="text-caption text-ink-muted">Catalogue Markdown · {documents.bounded ? "sélection sémantique limitée" : query.mode === "text" ? "texte extrait" : "titres et références"}</span>
    </div>
    {documents.items.length ? <ul className="divide-y divide-border border-y border-border">
      {documents.items.map((document) => <li key={document.document_id} className="py-5 first:pt-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <FileText className="size-3.5" aria-hidden /><span>{familyLabels[document.family] ?? document.family}</span>
          <span aria-hidden>·</span><span>{document.page_count} pages</span>
          {document.period_label ? <><span aria-hidden>·</span><span>Période {document.period_label}</span></> : null}
        </div>
        <Link href={`/documents/${document.slug}?page=${document.match_page ?? 1}`} className="group inline-flex items-start gap-2 text-base font-semibold leading-6 text-navy-ink hover:underline underline-offset-4">
          {document.title}<ArrowRight className="mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
        </Link>
        {document.snippet ? <p className="mt-3 line-clamp-3 max-w-3xl font-reading text-[15px] leading-7 text-ink-muted">{document.snippet}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-caption">
          <span className="text-emerald">Texte disponible</span>
          {document.entity_count ? <span className="inline-flex items-center gap-1 text-ink-muted"><Network className="size-3" aria-hidden />{document.entity_count} entités</span> : <span className="text-ink-muted">Entités non extraites</span>}
          {document.source_urls[0] ? <a href={`${document.source_urls[0]}#page=${document.match_page ?? 1}`} target="_blank" rel="noreferrer" className="text-gold-ink underline underline-offset-4">PDF officiel{document.match_page ? ` · p. ${document.match_page}` : ""}</a> : <span className="text-ink-muted">Lien PDF non retrouvé</span>}
        </div>
      </li>)}
    </ul> : <div className="border border-dashed border-border px-6 py-16 text-center">
      <h3 className="font-display text-lg font-semibold text-navy-ink">{documents.bounded && !query.q ? "Rechercher par le sens" : "Aucun document pour ces critères"}</h3>
      <p className="mt-2 text-small text-ink-muted">Essayez une autre expression ou élargissez les filtres.</p>
    </div>}
    {pages > 1 ? <nav aria-label="Pagination du corpus" className="mt-6 flex items-center justify-between gap-3">
      {documents.page > 1 ? <Button asChild variant="outline" size="sm"><Link href={corpusLink(query, { page: documents.page - 1 })}>Précédente</Link></Button> : <span />}
      <span className="text-caption text-ink-muted">Page {documents.page} sur {pages}</span>
      {documents.page < pages ? <Button asChild variant="outline" size="sm"><Link href={corpusLink(query, { page: documents.page + 1 })}>Suivante</Link></Button> : <span />}
    </nav> : null}
  </div>;
}
