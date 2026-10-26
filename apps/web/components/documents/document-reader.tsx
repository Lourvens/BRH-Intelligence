import { ArrowLeft, ArrowRight, Download, ExternalLink, Network } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { dateLabel, familyLabels } from "@/lib/corpus/labels";
import type { DocumentPage, ResearchDocument } from "@/lib/corpus/types";
import { CopyReference } from "./copy-reference";
import { MarkdownPage } from "./markdown-page";

export function DocumentReader({ document, content }: { document: ResearchDocument; content: DocumentPage }) {
  return <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
    <Link href="/brh-corpus" className="inline-flex items-center gap-2 text-caption text-teal hover:underline"><ArrowLeft className="size-3.5" aria-hidden />Retour au corpus</Link>
    <div className="mt-7 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
      <aside className="min-w-0 space-y-6 border-b border-border pb-6 lg:border-b-0 lg:border-r lg:pr-7">
        <div><p className="mb-2 text-caption font-semibold uppercase tracking-wider text-teal">Document source</p>
          <p className="text-small text-ink-muted">{familyLabels[document.family] ?? document.family}</p></div>
        <dl className="space-y-4 text-caption">
          <div><dt className="text-ink-muted">Période couverte</dt><dd className="mt-1 text-small text-ink">{document.period_label ?? "Non déterminée"}</dd></div>
          <div><dt className="text-ink-muted">Date de publication</dt><dd className="mt-1 text-small text-ink">{document.publication_date ? dateLabel(document.publication_date) : "Non vérifiée"}</dd></div>
          {document.uploaded_at ? <div><dt className="text-ink-muted">Mise en ligne WordPress</dt><dd className="mt-1 text-small text-ink">{dateLabel(document.uploaded_at)}</dd></div> : null}
          <div><dt className="text-ink-muted">Extraction</dt><dd className="mt-1 text-small text-ink">Markdown OCR · {document.page_count} pages · {document.figure_count} figures</dd></div>
        </dl>
        <div className="space-y-3 border-t border-border pt-5">
          {content.pdf_url ? <Button asChild className="w-full justify-start rounded-sm"><a href={content.pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden />PDF officiel · p. {content.page_number}</a></Button> : <p className="text-caption leading-5 text-ink-muted">Le lien PDF officiel n’a pas encore été retrouvé dans l’inventaire.</p>}
          <CopyReference title={document.title} page={content.page_number} pdfUrl={content.pdf_url} />
          {content.publication_id ? <Button asChild variant="outline" className="w-full justify-start rounded-sm"><a href={`/api/corpus/documents/${encodeURIComponent(document.slug)}/versions/${content.publication_id}/markdown`} download><Download className="size-4" aria-hidden />Télécharger le Markdown</a></Button> : null}
          <Button asChild variant="ghost" size="sm" className="justify-start px-0"><Link href={`/brh-corpus?mode=entities&document_id=${document.document_id}`}><Network className="size-4" aria-hidden />Explorer les entités</Link></Button>
        </div>
        <details className="text-caption text-ink-muted"><summary className="cursor-pointer py-2">Identité de la source</summary><p className="mt-2 break-all font-mono leading-5">SHA-256 : {document.sha256}</p><p className="mt-2 break-all font-mono leading-5">Version du texte : {content.artifact_hash}</p>{content.published_at ? <p className="mt-2">Publié dans le corpus le {dateLabel(content.published_at)}</p> : null}</details>
      </aside>
      <div className="min-w-0">
        <h1 className="max-w-3xl font-display text-2xl font-semibold leading-snug tracking-tight text-navy-ink sm:text-3xl">{document.title}</h1>
        <p className="mt-3 max-w-3xl text-caption leading-5 text-ink-muted">Transcription OCR · Vérifiez les valeurs et la mise en page dans le document original.</p>
        <nav aria-label="Pages du document" className="my-7 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
          <span className="text-small font-semibold text-navy-ink">Page PDF {content.page_number} / {content.page_count}</span>
          <form method="get" className="flex items-center gap-2"><label htmlFor="reader-page" className="text-caption text-ink-muted">Aller à</label><input id="reader-page" name="page" type="number" min={1} max={content.page_count} defaultValue={content.page_number} className="h-8 w-20 rounded-sm border border-border bg-surface px-2 text-small" /><Button type="submit" size="sm" variant="outline">Ouvrir</Button></form>
        </nav>
        <div className="mx-auto max-w-[780px]"><MarkdownPage markdown={content.markdown} slug={document.slug} publicationId={content.publication_id} /></div>
        <nav aria-label="Page suivante ou précédente" className="mt-10 flex justify-between gap-3 border-t border-border pt-5">
          {content.page_number > 1 ? <Button asChild variant="outline"><Link href={`?page=${content.page_number - 1}`}><ArrowLeft className="size-4" aria-hidden />Précédente</Link></Button> : <span />}
          {content.page_number < content.page_count ? <Button asChild variant="outline"><Link href={`?page=${content.page_number + 1}`}>Suivante<ArrowRight className="size-4" aria-hidden /></Link></Button> : <span />}
        </nav>
      </div>
    </div>
  </div>;
}
