import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntityProfile } from "@/components/corpus/entity-profile";
import { CorpusUnavailable } from "@/components/corpus/unavailable";
import { CorpusRequestError, loadEntity } from "@/lib/corpus/server";
import type { SearchParams } from "@/lib/corpus/types";
import type { CorpusRateLimit } from "@/lib/corpus/rate-limit";

export const metadata: Metadata = {
  title: "Entités et relations documentaires",
  robots: { index: false, follow: true },
};

export default async function EntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entityId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { entityId } = await params;
  const values = await searchParams;
  const query = Object.fromEntries(
    ["hops", "family", "year", "kind", "relationship"].flatMap((key) =>
      typeof values[key] === "string" && values[key] && values[key] !== "all"
        ? [[key, values[key] as string]]
        : [],
    ),
  );
  let data;
  let status = 200;
  let rateLimit: CorpusRateLimit | null = null;
  try {
    data = await loadEntity(entityId, new URLSearchParams(query).toString());
  } catch (error) {
    status = error instanceof CorpusRequestError ? error.status : 503;
    rateLimit = error instanceof CorpusRequestError ? error.rateLimit : null;
  }
  if (status === 404) notFound();
  return (
    <>
      {data ? (
        <EntityProfile {...data} query={query} />
      ) : (
        <div className="px-5 py-16">
          <CorpusUnavailable surface="entity" invalid={status === 400} rateLimit={rateLimit} />
        </div>
      )}
    </>
  );
}
