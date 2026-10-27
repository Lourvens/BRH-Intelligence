"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  Network,
  Info,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { dateLabel, familyLabels } from "@/lib/corpus/labels";
import type { DocumentPage, ResearchDocument } from "@/lib/corpus/types";
import { CopyReference } from "./copy-reference";
import { MarkdownPage } from "./markdown-page";
import { Reveal } from "@/components/corpus/reveal";
export function DocumentReader({
  document,
  content,
}: {
  document: ResearchDocument;
  content: DocumentPage;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(true);
  const [returnLabel, setReturnLabel] = useState("Retour aux documents");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("brh-research-return") ?? "";
      if (saved.startsWith("/brh-corpus/graph"))
        setReturnLabel("Retour au graphe");
      else if (saved.startsWith("/brh-corpus/entities"))
        setReturnLabel("Retour aux entités");
    } catch {}
  }, []);
  const page = content.page_number;
  const info = (
    <div className="atlas-reader-info">
      <p className="atlas-kicker mb-6">À LA SOURCE</p>
      <dl>
        <div>
          <dt>Collection</dt>
          <dd>{familyLabels[document.family] ?? document.family}</dd>
        </div>
        <div>
          <dt>Période couverte</dt>
          <dd>{document.period_label ?? "Non déterminée"}</dd>
        </div>
        <div>
          <dt>Date de publication</dt>
          <dd>
            {document.publication_date
              ? dateLabel(document.publication_date)
              : "Non vérifiée"}
          </dd>
        </div>
        <div>
          <dt>Dans ce document</dt>
          <dd>
            {document.page_count} pages · {document.figure_count} figures
          </dd>
        </div>
      </dl>
      <div className="reader-actions">
        {content.pdf_url ? (
          <Button asChild>
            <a href={content.pdf_url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              PDF officiel · p. {page}
            </a>
          </Button>
        ) : (
          <p className="text-caption leading-5 text-ink-muted">
            Lien PDF officiel non retrouvé dans l’inventaire.
          </p>
        )}
        <CopyReference
          title={document.title}
          page={page}
          pdfUrl={content.pdf_url}
        />
        {content.publication_id && (
          <Button asChild variant="outline">
            <a
              href={`/api/corpus/documents/${encodeURIComponent(document.slug)}/versions/${content.publication_id}/markdown`}
              download
            >
              <Download size={16} />
              Télécharger le Markdown
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link
            href={`/brh-corpus/graph?focus=document:${document.document_id}`}
          >
            <Network size={16} />
            Explorer les connexions
          </Link>
        </Button>
      </div>
      <details className="text-caption leading-6 text-ink-muted">
        <summary className="cursor-pointer">
          Identité et version de la source
        </summary>
        <p className="mt-3 break-all font-mono">SHA-256 : {document.sha256}</p>
        <p className="mt-2 break-all font-mono">
          Texte : {content.artifact_hash}
        </p>
        {content.published_at && (
          <p className="mt-2">
            Publié dans le corpus le {dateLabel(content.published_at)}
          </p>
        )}
      </details>
    </div>
  );
  return (
    <div className="atlas-page">
      <button
        type="button"
        className="mb-7 flex min-h-11 items-center gap-2 text-small text-teal"
        onClick={() => {
          try {
            const saved = sessionStorage.getItem("brh-research-return");
            if (saved && /^\/brh-corpus(?:[/?]|$)/.test(saved)) {
              sessionStorage.setItem("brh-research-restore", saved);
              // A full graph navigation retains native-history selection parameters
              // that Next's cached static graph route can otherwise discard.
              if (saved.startsWith("/brh-corpus/graph")) window.location.assign(saved);
              else router.push(saved, { scroll: false });
              return;
            }
          } catch {
            /* A direct visit still has a working catalogue return. */
          }
          router.push("/brh-corpus");
        }}
      >
        <ArrowLeft size={16} />
        {returnLabel}
      </button>
      <Reveal>
        <p className="atlas-kicker mb-3">
          {familyLabels[document.family] ?? document.family} · LECTURE
        </p>
        <h1 className="atlas-reading-title">{document.title}</h1>
      </Reveal>
      <div className="atlas-reader-toolbar">
        <span className="flex items-center gap-2 text-small">
          <BookOpen size={17} className="text-teal" />
          <strong>Page {page}</strong>
          <span className="text-ink-muted">/ {content.page_count}</span>
        </span>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="reader-page" className="sr-only">
              Aller à la page
            </label>
            <input
              id="reader-page"
              name="page"
              type="number"
              min={1}
              max={content.page_count}
              defaultValue={page}
              className="h-11 w-16 rounded-xl border border-border bg-bg px-2 text-small"
            />
            <Button type="submit" variant="outline" className="h-11 rounded-xl">
              Aller
            </Button>
          </form>
          <button
            type="button"
            className="hidden min-h-11 items-center gap-2 rounded-xl px-3 text-small xl:flex"
            aria-expanded={notes}
            onClick={() => setNotes(!notes)}
          >
            <Info size={17} />
            Informations
            <ChevronDown size={14} />
          </button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-11 rounded-xl xl:hidden"
                aria-label="Informations et actions du document"
              >
                <Info size={17} />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Informations & actions</SheetTitle>
                <SheetDescription>
                  Sources, citation et téléchargement
                </SheetDescription>
              </SheetHeader>
              <div className="px-6 pb-8">{info}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div
        className="atlas-reader-layout"
        style={!notes ? { gridTemplateColumns: "minmax(0,1fr)" } : undefined}
      >
        <div className="min-w-0">
          <Reveal key={`${document.document_id}:${page}`}>
            <section
              className="atlas-reading-paper"
              aria-label={`Transcription, page ${page}`}
            >
              <div className="mb-9 flex items-center gap-3 border-b border-border pb-5 text-caption text-ink-muted">
                <span className="rounded-full bg-surface-alt px-3 py-1 text-teal">
                  Transcription OCR
                </span>
                <span>Vérifiez les valeurs dans l’original.</span>
              </div>
              <MarkdownPage
                markdown={content.markdown}
                slug={document.slug}
                publicationId={content.publication_id}
              />
              <p className="mt-12 border-t border-border pt-6 text-center text-caption text-ink-muted">
                Fin de la page {page}
              </p>
            </section>
          </Reveal>
          <nav aria-label="Pages du document" className="atlas-reader-bottom">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={`?page=${page - 1}`}>
                  <ArrowLeft size={16} />
                  Précédente
                </Link>
              </Button>
            ) : (
              <span />
            )}
            <span className="text-caption text-ink-muted">
              {page} / {content.page_count}
            </span>
            {page < content.page_count ? (
              <Button asChild>
                <Link href={`?page=${page + 1}`}>
                  Suivante
                  <ArrowRight size={16} />
                </Link>
              </Button>
            ) : (
              <span />
            )}
          </nav>
        </div>
        {notes && (
          <aside
            className="atlas-reader-notes"
            aria-label="Informations du document"
          >
            {info}
          </aside>
        )}
      </div>
    </div>
  );
}
