import { describe, expect, test } from "bun:test";
import { loadReaderBatch } from "./reader-batch";
import type { DocumentPage } from "./types";
const initial: DocumentPage = {
  document_id: "document",
  slug: "rapport",
  title: "Rapport",
  artifact_hash: "artifact",
  publication_id: "publication",
  published_at: null,
  source_sha256: "sha",
  page_number: 1,
  page_count: 9,
  markdown: "Page 1",
  pdf_url: null,
};
const signal = new AbortController().signal;
const response = (url: string, patch: Partial<DocumentPage> = {}) =>
  Response.json({
    content: {
      ...initial,
      page_number: Number(url.split("/").pop()),
      ...patch,
    },
  });
describe("continuous reader batches", () => {
  test("keeps five pages ordered and forwards cancellation", async () => {
    const calls: string[] = [];
    const pages = await loadReaderBatch(
      initial,
      2,
      6,
      signal,
      async (url, init) => {
        calls.push(url);
        expect(init.signal).toBe(signal);
        return response(url);
      },
    );
    expect(calls).toHaveLength(5);
    expect(pages.map((page) => page.page_number)).toEqual([2, 3, 4, 5, 6]);
  });
  test("loads a shorter final batch without requesting beyond the document", async () => {
    const pages = await loadReaderBatch(initial, 8, 9, signal, async (url) =>
      response(url),
    );
    expect(pages.map((page) => page.page_number)).toEqual([8, 9]);
  });
  test("rejects mixed versions rather than displaying inconsistent citations", async () => {
    await expect(
      loadReaderBatch(initial, 2, 6, signal, async (url) =>
        response(
          url,
          url.endsWith("4") ? { publication_id: "new-version" } : {},
        ),
      ),
    ).rejects.toThrow("version");
  });
  test("a failed page fails the batch so retry cannot leave a gap", async () => {
    await expect(
      loadReaderBatch(initial, 2, 6, signal, async (url) =>
        url.endsWith("3") ? new Response(null, { status: 503 }) : response(url),
      ),
    ).rejects.toThrow("Réessayez");
  });
  test("rejects out-of-bounds or oversized batches before network access", async () => {
    let calls = 0;
    const request = async (url: string) => {
      calls++;
      return response(url);
    };
    await expect(
      loadReaderBatch(initial, 0, 4, signal, request),
    ).rejects.toThrow("invalide");
    await expect(
      loadReaderBatch(initial, 1, 9, signal, request),
    ).rejects.toThrow("invalide");
    expect(calls).toBe(0);
  });
});
