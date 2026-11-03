import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

export const entity = "entity:00000000-0000-0000-0000-000000000001";
export const doc = "document:00000000-0000-0000-0000-000000000002";
export const edge =
  "mention:00000000-0000-0000-0000-000000000002:00000000-0000-0000-0000-000000000001";
export const graph = {
  view: "mentions",
  nodes: [
    {
      id: entity,
      label: "Banque de la République d’Haïti",
      kind: "institution",
      degree: 1,
      slug: null,
      document_id: null,
    },
    {
      id: doc,
      label: "Rapport sur les prix",
      kind: "document",
      degree: 1,
      slug: "rapport-prix",
      document_id: doc.split(":")[1],
    },
  ],
  edges: [
    {
      id: edge,
      source: doc,
      target: entity,
      type: "mention",
      label: "mentionne",
      weight: 1,
    },
  ],
  matching_nodes: 800,
  matching_edges: 900,
  displayed_nodes: 2,
  displayed_edges: 1,
  truncated: true,
};

export function evidenceFixture() {
  return {
    items: [
      {
        document_id: doc.split(":")[1],
        slug: "rapport-prix",
        title: "Rapport sur les prix",
        page_number: 7,
        quote: "La BRH mesure les prix.",
        artifact_hash: "a".repeat(64),
        pdf_url: null,
      },
    ],
    total: 1,
    page: 1,
    page_size: 10,
  };
}
