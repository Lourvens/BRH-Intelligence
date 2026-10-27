import "server-only";
import { cache } from "react";

import type {
  CatalogueData,
  CorpusStats,
  DocumentList,
  DocumentPage,
  Entity,
  Evidence,
  Facets,
  GraphResult,
  ResearchDocument,
  SearchParams,
} from "./types";

export class CorpusRequestError extends Error {
  constructor(public status: number) {
    super(`Corpus request failed (${status})`);
  }
}

export function corpusUrl(path: string) {
  const base = process.env.BRH_CORPUS_API_URL ?? "http://127.0.0.1:2024";
  return `${base.replace(/\/$/, "")}/corpus/v1/${path}`;
}

export async function corpusGet<T>(path: string): Promise<T> {
  const response = await fetch(corpusUrl(path), {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new CorpusRequestError(response.status);
  return response.json() as Promise<T>;
}

export function catalogueQuery(params: SearchParams) {
  const allowed = [
    "q",
    "mode",
    "family",
    "year",
    "sort",
    "page",
    "entity_id",
    "document_id",
    "kind",
  ];
  return Object.fromEntries(
    allowed.flatMap((key) => {
      const value = params[key];
      return typeof value === "string" && value && value !== "all"
        ? [[key, value]]
        : [];
    }),
  );
}

export async function loadCatalogue(
  params: SearchParams,
): Promise<CatalogueData> {
  const query = catalogueQuery(params);
  const search = new URLSearchParams(query).toString();
  const empty: DocumentList = { items: [], total: 0, page: 1, page_size: 25 };
  let searchError: CatalogueData["searchError"];
  const documentsRequest =
    query.mode === "entities"
      ? Promise.resolve(empty)
      : query.mode === "semantic" && !query.q
        ? Promise.resolve({ ...empty, page_size: 20, bounded: true })
        : corpusGet<DocumentList>(
            `${query.mode === "semantic" ? "search" : "documents"}?${search}`,
          );
  const entitiesRequest =
    query.mode === "entities"
      ? corpusGet<{ items: Entity[] }>(`entities?${search}`)
      : Promise.resolve({ items: [] as Entity[] });
  const [stats, facets, documents, entities] = await Promise.all([
    corpusGet<CorpusStats>("stats").catch(() => null),
    corpusGet<Facets>(`facets?${search}`).catch(() => ({
      families: [],
      years: [],
    })),
    documentsRequest.catch((error) => {
      if (
        error instanceof CorpusRequestError &&
        error.status === 400 &&
        query.mode !== "semantic"
      )
        throw error;
      searchError = query.mode === "semantic" ? "semantic" : "unavailable";
      return empty;
    }),
    entitiesRequest,
  ]);
  return {
    query,
    stats,
    facets,
    documents,
    entities: entities.items,
    searchError,
  };
}

export const corpusDocument = cache((slug: string) =>
  corpusGet<ResearchDocument>(`documents/${encodeURIComponent(slug)}`),
);

export async function loadDocument(slug: string, page: number) {
  return corpusGet<{ document: ResearchDocument; content: DocumentPage }>(
    `documents/${encodeURIComponent(slug)}/reader/${page}`,
  );
}

export async function loadEntity(identifier: string, search: string) {
  const path = `entities/${encodeURIComponent(identifier)}`;
  const [profile, graph] = await Promise.all([
    corpusGet<{
      entity: Entity;
      passages: { items: Evidence[]; truncated: boolean };
    }>(path),
    corpusGet<GraphResult>(`${path}/graph?${search}`),
  ]);
  return { ...profile, graph };
}
