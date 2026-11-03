import { expect, test } from "@playwright/test";

import { noOverflow } from "./support/research";

test("responsive research navigation stays within the viewport", async ({
  page,
}) => {
  await page.goto("/brh-corpus/entities");
  await expect(
    page.getByRole("heading", { name: "Répertoire des entités", level: 1 }),
  ).toBeVisible();
  for (const width of [320, 360, 390, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow(page);
  }
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
