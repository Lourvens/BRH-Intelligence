import type { Metadata } from "next";
import { CorpusCatalogue } from "@/components/corpus/catalogue";
import { ResearchHeader } from "@/components/corpus/research-header";
import { CorpusUnavailable } from "@/components/corpus/unavailable";
import { CorpusRequestError, loadCatalogue } from "@/lib/corpus/server";
import type { SearchParams } from "@/lib/corpus/types";

export const metadata: Metadata = {
  title: "Corpus documentaire", description: "Publications BRH en Markdown, recherche de passages et exploration des entités avec sources.",
  alternates: { canonical: "/brh-corpus" },
};

export default async function CorpusPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  let data;
  let invalid = false;
  try { data = await loadCatalogue(await searchParams); }
  catch (error) { invalid = error instanceof CorpusRequestError && error.status === 400; }
  return <div className="min-h-dvh bg-surface text-ink">
    <ResearchHeader /><main id="contenu">{data ? <CorpusCatalogue data={data} /> : <div className="px-5 py-16"><CorpusUnavailable invalid={invalid} /></div>}</main>
  </div>;
}
