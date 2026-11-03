import { describe, expect, test } from "bun:test";
import { documentPageHref, entityHref, graphFocusHref } from "./links";

describe("corpus links", () => {
  test("builds a document page link from a slug", () => {
    expect(documentPageHref("rapport-prix", 7)).toBe(
      "/documents/rapport-prix?page=7",
    );
    expect(documentPageHref("note-inflation", 1)).toBe(
      "/documents/note-inflation?page=1",
    );
  });
  test("keeps UUIDs unencoded in document and entity links", () => {
    const id = "00000000-0000-0000-0000-000000000001";
    expect(documentPageHref(id, 2)).toBe(`/documents/${id}?page=2`);
    expect(entityHref(id)).toBe(`/brh-corpus/entities/${id}`);
  });
  test("builds graph focus links for every node kind", () => {
    expect(graphFocusHref("document", "doc-1")).toBe(
      "/brh-corpus/graph?focus=document:doc-1",
    );
    expect(graphFocusHref("entity", "entity-1")).toBe(
      "/brh-corpus/graph?focus=entity:entity-1",
    );
  });
});
