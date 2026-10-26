import React from "react";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownPage } from "../components/documents/markdown-page";
import { figureUrl } from "../lib/corpus/markdown";
import { corpusLink } from "../lib/corpus/query";

describe("research Markdown", () => {
  test("preserves tables while removing executable OCR markup", () => {
    const html = renderToStaticMarkup(<MarkdownPage slug="source" markdown={'<script>alert(1)</script>\n\n<table><tr><td colspan="2" onclick="alert(1)">Montant</td></tr></table>\n\n[x](javascript:alert(1))\n\n![](assets/p001/chart.png)'} />);
    expect(html).toContain('colSpan="2"');
    expect(html).toContain("Montant");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("/api/corpus/documents/source/assets/p001/chart.png");
  });
  test("figures never become arbitrary proxies", () => {
    expect(figureUrl("source", "https://evil.test/a.png")).toBeNull();
    expect(figureUrl("source", "assets/../meta.json")).toBeNull();
    expect(figureUrl("source", "assets/active.svg")).toBeNull();
  });
  test("pagination preserves research scope", () => {
    const url = corpusLink({ q: "circulaire 95-1A", family: "circular", entity_id: "id" }, { page: 2 });
    const query = new URL(url, "http://localhost").searchParams;
    expect(query.get("q")).toBe("circulaire 95-1A");
    expect(query.get("entity_id")).toBe("id");
    expect(query.get("page")).toBe("2");
  });
});
