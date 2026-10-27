import { test, expect } from "@playwright/test";

async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("catalogue search, reading and return preserve context", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/brh-corpus");
  await expect(
    page.getByRole("heading", { name: "Bibliothèque documentaire" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher", exact: true })
    .fill("conventions");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page).toHaveURL(/q=conventions/);
  await expect(page.locator(".atlas-document").first()).toBeVisible();
  await noOverflow(page);
  await page.locator(".atlas-document h3 a").first().click();
  await expect(page.locator(".atlas-reading-paper")).toBeVisible();
  await expect(page.locator(".research-reading")).not.toBeEmpty();
  await noOverflow(page);
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Informations et actions du document" })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await page.getByRole("link", { name: "Suivante", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("button", { name: "Retour aux documents" }).click();
  await expect(page).toHaveURL(/q=conventions/);
  expect(errors).toEqual([]);
});

test("mobile filters apply explicitly and discard dismissed drafts", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Touch filter interaction");
  await page.goto("/brh-corpus");
  await page.getByRole("button", { name: "Filtres", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("combobox").first().click();
  await page.getByRole("option").nth(1).click();
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
  expect(new URL(page.url()).searchParams.has("family")).toBe(false);
  await page.getByRole("button", { name: "Filtres", exact: true }).click();
  await sheet.getByRole("combobox").first().click();
  await page.getByRole("option").nth(1).click();
  await sheet.getByRole("button", { name: "Appliquer", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("family"))
    .toBeTruthy();
  await expect(sheet).not.toBeVisible();
  await noOverflow(page);
});

const entity = "entity:00000000-0000-0000-0000-000000000001";
const doc = "document:00000000-0000-0000-0000-000000000002";
const edge =
  "mention:00000000-0000-0000-0000-000000000002:00000000-0000-0000-0000-000000000001";
const graph = {
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
    route.fulfill({
      json: {
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
      },
    }),
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

test("responsive research navigation stays within the viewport", async ({
  page,
}) => {
  await page.goto("/brh-corpus/entities");
  await expect(
    page.getByRole("heading", { name: "Répertoire des entités" }),
  ).toBeVisible();
  for (const width of [320, 360, 390, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow(page);
  }
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

test("legacy entity links preserve search and navigation is keyboard accessible", async ({
  page,
}) => {
  await page.goto("/brh-corpus?mode=entities&q=BRH");
  await expect(page).toHaveURL(/\/brh-corpus\/entities\?q=BRH/);
  await expect(
    page.getByRole("textbox", { name: "Rechercher", exact: true }),
  ).toHaveValue("BRH");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("A");
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await noOverflow(page);
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
  await expect(page.locator(".atlas-reading-paper")).toBeVisible();
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
