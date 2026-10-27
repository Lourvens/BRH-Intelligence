import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResearchHeader } from "@/components/corpus/research-header";
import { CorpusUnavailable } from "@/components/corpus/unavailable";
import { DocumentReader } from "@/components/documents/document-reader";
import { CorpusRequestError, corpusDocument, loadDocument } from "@/lib/corpus/server";
import type { SearchParams } from "@/lib/corpus/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const document = await corpusDocument(slug);
    return { title: document.title, description: `Lire ${document.title} en Markdown avec les pages du PDF officiel.`, alternates: { canonical: `/documents/${slug}` } };
  } catch {
    return { title: "Document BRH", robots: { index: false, follow: true } };
  }
}

export default async function ReaderPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const page = Number(query.page ?? 1);
  let data;
  let status = Number.isInteger(page) && page > 0 ? 200 : 400;
  if (status === 200) {
    try { data = await loadDocument(slug, page); }
    catch (error) { status = error instanceof CorpusRequestError ? error.status : 503; }
  }
  if (status === 404) notFound();
  return <div className="min-h-dvh bg-bg text-ink"><ResearchHeader /><main id="contenu">
    {data ? <DocumentReader {...data} /> : <div className="px-5 py-16"><CorpusUnavailable document status={status} invalid={status === 400} /></div>}
  </main></div>;
}
