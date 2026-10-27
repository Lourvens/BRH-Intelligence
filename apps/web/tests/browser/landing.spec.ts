import { expect, test } from "@playwright/test";

test("landing connects the agent preview to real research on every screen", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const motionToggle = page.getByRole("button", {
    name: "Suspendre l’animation",
  });
  await expect(motionToggle).toBeVisible();
  if (!isMobile) {
    const stage = await page.locator(".landing-motion-stage").boundingBox();
    if (!stage) throw new Error("Hero illustration must be visible");
    await page.mouse.move(
      stage.x + stage.width * 0.75,
      stage.y + stage.height * 0.3,
    );
    await expect
      .poll(() =>
        page
          .locator(".landing-tilt-layer")
          .evaluate((element) => getComputedStyle(element).transform),
      )
      .not.toBe("none");
  }
  await motionToggle.click();
  await expect(
    page.getByRole("button", { name: "Reprendre l’animation" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".landing-tilt-layer")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(page.locator(".landing-constellation")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "haïtienne",
  );
  await expect(
    page.getByRole("link", { name: "Explorer le corpus", exact: true }),
  ).toHaveAttribute("href", "/brh-corpus");
  await page.getByRole("tab", { name: "Comparer", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("politique monétaire");
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveAttribute(
    "href",
    /politique%20mon%C3%A9taire/,
  );
  await page.getByRole("tab", { name: "Relier", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tabpanel")).toContainText(
    "supervision bancaire",
  );
  await expect(
    page.getByText("Exemples éditoriaux, sans réponse générée en direct."),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        { message: `No horizontal overflow at ${width}px` },
      )
      .toBe(true);
  }
  for (const anchor of await page
    .locator('a[href^="/#"], a[href^="#"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")!.split("#")[1]),
    )) {
    expect(await page.locator(`[id="${anchor}"]`).count()).toBeGreaterThan(0);
  }
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.reload();
  await expect(page.locator(".landing-motion-toggle")).toHaveCount(0);
  await expect(page.locator(".landing-tilt-layer")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
