import { expect, test } from "@playwright/test";

import { doc, evidenceFixture, graph, noOverflow } from "./support/research";

test("graph list, evidence and focus work on touch and desktop", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requests: URL[] = [];
  await page.route("**/api/corpus/graph?*", (route) => {
    requests.push(new URL(route.request().url()));
    return route.fulfill({ json: graph });
  });
  await page.route("**/api/corpus/graph/edges/**/evidence?*", (route) =>
    route.fulfill({ json: evidenceFixture() }),
  );
  await page.goto("/brh-corpus/graph");
  await expect(page.getByText("2 / 800 nœuds", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom avant" })).toBeInViewport(
    { ratio: 1 },
  );
  await page.getByRole("button", { name: "Afficher la liste" }).click();
  await page
    .getByRole("button", { name: /Banque de la République/ })
    .first()
    .click();
  const inspector =
    testInfo.project.name === "mobile"
      ? page.getByRole("dialog")
      : page.locator(".atlas-graph-inspector");
  await expect(
    inspector.getByRole("heading", { name: "Banque de la République d’Haïti" }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const sheetBox = await inspector.boundingBox();
    const mapBox = await page.locator(".atlas-graph-workspace").boundingBox();
    expect(sheetBox!.y).toBeGreaterThan(mapBox!.y + 48);
  }
  await inspector.getByRole("button", { name: /Rapport sur les prix/ }).click();
  await expect(inspector.getByText("La BRH mesure les prix.")).toBeVisible();
  await expect(
    inspector.getByRole("link", { name: /Rapport sur les prix/ }),
  ).toHaveAttribute("href", "/documents/rapport-prix?page=7");
  await inspector.getByRole("button", { name: "Fermer la sélection" }).click();
  if (testInfo.project.name === "mobile")
    await expect(
      page.getByRole("button", { name: /Banque de la République/ }).first(),
    ).toBeFocused();
  await page
    .getByRole("button", { name: /Banque de la République/ })
    .first()
    .click();
  await inspector.getByRole("button", { name: "Explorer autour" }).click();
  await expect(page).toHaveURL(/focus=entity/);
  await expect(page.getByText("Vue locale", { exact: true })).toBeVisible();
  expect(requests[0].searchParams.get("node_limit")).toBe(
    testInfo.project.name === "mobile" ? "120" : "300",
  );
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("graph canvas supports the maximum topology and reduced motion", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Maximum desktop topology");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const nodes = Array.from({ length: 500 }, (_, i) => ({
    id: `entity:${i}`,
    label: `Institution ${i}`,
    kind: "institution",
    degree: 4,
    slug: null,
    document_id: null,
  }));
  const edges = Array.from({ length: 1000 }, (_, i) => ({
    id: `assertion:${i}`,
    source: nodes[i % 500].id,
    target: nodes[(i + 1) % 500].id,
    type: "assertion",
    label: "mesure",
    weight: 1,
  }));
  await page.route("**/api/corpus/graph?*", (route) =>
    route.fulfill({
      json: {
        ...graph,
        nodes,
        edges,
        displayed_nodes: 500,
        displayed_edges: 1000,
        matching_nodes: 500,
        matching_edges: 1000,
        truncated: false,
      },
    }),
  );
  await page.goto("/brh-corpus/graph");
  await expect(page.locator(".atlas-network canvas")).toBeVisible();
  await page.getByRole("button", { name: "Zoom avant" }).click();
  await page.getByRole("button", { name: "Recentrer le graphe" }).click();
  await page.getByRole("button", { name: "Afficher la liste" }).click();
  await expect(
    page.getByRole("button", { name: /^Institution 0\b/ }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("reading a graph document returns to its selected list context", async ({
  page,
}) => {
  const response = await page.request.get("/api/corpus/documents?page_size=1");
  const publication = (await response.json()).items[0];
  const fixture = {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === doc ? { ...n, slug: publication.slug } : n,
    ),
  };
  await page.route("**/api/corpus/graph?*", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.goto("/brh-corpus/graph?display=list");
  await page
    .getByRole("button", { name: /Rapport sur les prix/ })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Lire le document", exact: true })
    .click();
  await expect(page.locator(".atlas-reading-paper").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Retour au graphe", exact: true })
    .click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe("/brh-corpus/graph");
  expect(new URL(page.url()).searchParams.get("display")).toBe("list");
  expect(new URL(page.url()).searchParams.get("selected")).toBe(doc);
  await expect(
    page.getByRole("link", { name: "Lire le document", exact: true }),
  ).toBeVisible();
});
