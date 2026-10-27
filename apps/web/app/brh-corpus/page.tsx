import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CorpusCatalogue } from "@/components/corpus/catalogue";
import { CorpusUnavailable } from "@/components/corpus/unavailable";
import { CorpusRequestError, loadCatalogue } from "@/lib/corpus/server";
import type { SearchParams } from "@/lib/corpus/types";

export const metadata: Metadata = {
  title: "Corpus documentaire",
  description:
    "Publications BRH en Markdown, recherche de passages et exploration des entités avec sources.",
  alternates: { canonical: "/brh-corpus" },
};

export default async function CorpusPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  if (params.mode === "entities") {
    const next = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) =>
        k !== "mode" && typeof v === "string" ? [[k, v]] : [],
      ),
    );
    redirect(`/brh-corpus/entities?${next}`);
  }
  let data;
  let invalid = false;
  try {
    data = await loadCatalogue(await searchParams);
  } catch (error) {
    invalid = error instanceof CorpusRequestError && error.status === 400;
  }
  return (
    <>
      {data ? (
        <CorpusCatalogue data={data} />
      ) : (
        <div className="px-5 py-16">
          <CorpusUnavailable invalid={invalid} />
        </div>
      )}
    </>
  );
}
