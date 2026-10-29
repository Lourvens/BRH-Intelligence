import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageContent } from "./message-content";

test("canonical citation links render as accessible claim-local buttons", () => {
  const markup = renderToStaticMarkup(createElement(MessageContent, {
    content: "Première affirmation.\n\nDeuxième affirmation. [1](#brh-source-1)",
    citations: [{ id: "d1:3", title: "Note BRH", page: 3, snippet: "Extrait",
      source: "note", kind: "Document" }],
    onSelectCitation: () => {},
  }));
  expect(markup).toContain("Voir la source 1 : Note BRH, page 3");
  expect(markup.indexOf("<button")).toBeGreaterThan(markup.indexOf("Deuxième affirmation"));
  expect(markup).not.toContain('href="#brh-source-1"');
});
