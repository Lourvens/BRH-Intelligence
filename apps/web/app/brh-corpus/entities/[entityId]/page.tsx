import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntityProfile } from "@/components/corpus/entity-profile";
import { ResearchHeader } from "@/components/corpus/research-header";
import { CorpusUnavailable } from "@/components/corpus/unavailable";
import { CorpusRequestError, loadEntity } from "@/lib/corpus/server";
import type { SearchParams } from "@/lib/corpus/types";

export const metadata: Metadata = { title: "Entités et relations documentaires", robots: { index: false, follow: true } };

export default async function EntityPage({ params, searchParams }: {
  params: Promise<{ entityId: string }>; searchParams: Promise<SearchParams>;
}) {
  const { entityId } = await params;
  const values = await searchParams;
  const query = Object.fromEntries(["hops", "family", "year", "kind", "relationship"].flatMap((key) =>
    typeof values[key] === "string" && values[key] && values[key] !== "all" ? [[key, values[key] as string]] : []));
  let data;
  let status = 200;
  try { data = await loadEntity(entityId, new URLSearchParams(query).toString()); }
  catch (error) { status = error instanceof CorpusRequestError ? error.status : 503; }
  if (status === 404) notFound();
  return <div className="min-h-dvh bg-surface text-ink"><ResearchHeader /><main id="contenu">
    {data ? <EntityProfile {...data} query={query} /> : <div className="px-5 py-16"><CorpusUnavailable invalid={status === 400} /></div>}
  </main></div>;
}
