import { expect, test } from "@playwright/test";

import { noOverflow } from "./support/research";

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
  await expect(page.locator(".atlas-reading-paper").first()).toBeVisible();
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
