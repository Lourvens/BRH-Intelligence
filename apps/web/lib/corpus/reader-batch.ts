import type { DocumentPage } from "./types";

/** All-or-nothing batches prevent gaps and mixed publication versions. */
export async function loadReaderBatch(
  initial: DocumentPage,
  start: number,
  end: number,
  signal: AbortSignal,
  request: (url: string, init: RequestInit) => Promise<Response> = fetch,
): Promise<DocumentPage[]> {
  if (start < 1 || end > initial.page_count || end - start >= 5)
    throw new Error("Plage de pages invalide.");
  if (start > end) return [];
  return Promise.all(
    Array.from({ length: end - start + 1 }, async (_, index) => {
      const response = await request(
        `/api/corpus/documents/${encodeURIComponent(initial.slug)}/reader/${start + index}`,
        { signal },
      );
      if (!response.ok)
        throw new Error("Les pages n’ont pas pu être chargées. Réessayez.");
      const value = (await response.json()) as { content?: DocumentPage };
      const page = value.content;
      if (
        !page ||
        page.page_number !== start + index ||
        page.document_id !== initial.document_id ||
        page.artifact_hash !== initial.artifact_hash ||
        page.publication_id !== initial.publication_id ||
        page.page_count !== initial.page_count ||
        typeof page.markdown !== "string"
      )
        throw new Error(
          "La version du document a changé. Rechargez le document pour poursuivre.",
        );
      return page;
    }),
  );
}
