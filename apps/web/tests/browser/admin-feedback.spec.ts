import { expect, test } from "@playwright/test";
import { sealData } from "iron-session";
import { ADMIN_COOKIE_NAME, credentialVersion } from "../../lib/admin/security";
import { noOverflow } from "./support/research";

test("admin routes reject anonymous access and cross-origin feedback", async ({ page, request, baseURL }) => {
  expect((await request.get("/api/admin/feedback")).status()).toBe(401);
  expect((await request.patch("/api/admin/feedback/00000000-0000-4000-8000-000000000001", { data: { status: "resolved", admin_note: "Unauthorized" } })).status()).toBe(401);
  const refused = await request.post("/api/feedback", {
    headers: { Origin: "https://untrusted.example" },
    data: { category: "bug", message: "Une tentative depuis une autre origine.", page_path: "/assistant" },
  });
  expect(refused.status()).toBe(403);
  await page.goto("/admin");
  await expect(page).toHaveURL(`${baseURL}/admin/login`);
  await expect(page.getByLabel("Clé d’accès")).toBeVisible();
  await noOverflow(page);
});

test("sealed sessions reject expired, revoked and tampered credentials", async ({ context, baseURL }) => {
  const secret = process.env.BRH_ADMIN_SESSION_SECRET ?? "local-browser-test-session-secret-32chars";
  const password = process.env.BRH_ADMIN_PASSWORD ?? "test-admin-password-2026";
  const valid = { authenticated: true, expiresAt: Date.now() + 60000, credentialVersion: credentialVersion(password) };
  const seal = (data: typeof valid) => sealData(data, { password: secret, ttl: 3600 });
  const setCookie = async (value: string) => {
    await context.clearCookies();
    await context.addCookies([{ name: ADMIN_COOKIE_NAME, value, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
  };
  await setCookie(await seal(valid));
  expect((await context.request.get("/api/admin/feedback")).status()).toBe(200);
  const invalidSessions = [
    await seal({ ...valid, expiresAt: Date.now() - 60000 }),
    await seal({ ...valid, credentialVersion: credentialVersion("previous-password") }),
    `tampered-${await seal(valid)}`,
  ];
  for (const value of invalidSessions) {
    await setCookie(value);
    expect((await context.request.get("/api/admin/feedback")).status()).toBe(401);
  }
  await context.clearCookies();
});

test("a user submits feedback and an admin reviews it through the real web proxy", async ({ page, baseURL }, testInfo) => {
  const message = `Avis navigateur ${testInfo.project.name} ${crypto.randomUUID()} : le contenu du corpus pourrait être plus clair.`;
  const note = `Vérification effectuée pour ${testInfo.project.name}.`;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/assistant");
  const trigger = page.getByRole("button", { name: "Donner un avis", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const feedback = page.getByRole("dialog");
  await expect(feedback.getByRole("heading", { name: "Aidez-nous à améliorer l’assistant" })).toBeVisible();
  await feedback.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(feedback.getByRole("alert")).toContainText("au moins 10 caractères");
  await expect(feedback.getByLabel("Votre avis", { exact: true })).toBeFocused();
  await feedback.getByLabel("Votre avis", { exact: true }).fill(message);
  await page.route("**/api/feedback", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Indisponible" } }) }));
  await feedback.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(feedback.getByRole("alert")).toContainText("Votre texte est conservé");
  await expect(feedback.getByLabel("Votre avis", { exact: true })).toHaveValue(message);
  await page.unroute("**/api/feedback");
  const sent = page.waitForResponse((response) => response.url().endsWith("/api/feedback") && response.request().method() === "POST");
  await feedback.getByRole("button", { name: "Envoyer mon avis" }).click();
  const sentResponse = await sent;
  expect(sentResponse.status()).toBe(201);
  const submittedId = (await sentResponse.json()).id;
  const submitted = sentResponse.request().postDataJSON();
  expect(submitted.answer_excerpt).toBeNull();
  expect(submitted.page_path).toBe("/assistant");
  await expect(feedback.getByRole("heading", { name: "Merci pour votre avis" })).toBeVisible();
  await noOverflow(page);
  await feedback.getByRole("button", { name: "Fermer", exact: true }).first().click();
  await expect(feedback).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await page.goto("/admin/login");
  await page.getByLabel("Clé d’accès").fill("incorrect-password");
  await page.getByRole("button", { name: "Accéder au tableau de bord" }).click();
  await expect(page.getByRole("status")).toContainText("incorrect");
  await page.getByLabel("Clé d’accès").fill(process.env.BRH_ADMIN_PASSWORD ?? "test-admin-password-2026");
  await page.getByRole("button", { name: "Accéder au tableau de bord" }).click();
  await expect(page).toHaveURL(`${baseURL}/admin`);
  await expect(page.getByRole("heading", { name: "Vue d’ensemble", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "État du service", exact: true })).toBeVisible();
  await noOverflow(page);
  const inbox = page.locator("#avis");
  await expect(inbox.getByText(message, { exact: true })).toBeVisible();
  const row = inbox.getByRole("listitem").filter({ hasText: message });
  const refusedUpdate = await page.request.patch(`/api/admin/feedback/${submittedId}`, {
    headers: { Origin: "https://untrusted.example" },
    data: { status: "resolved", admin_note: "This cross-origin update must be rejected." },
  });
  expect(refusedUpdate.status()).toBe(403);
  await row.getByRole("button", { name: /^Examiner/ }).click();
  const review = page.getByRole("dialog");
  await review.getByRole("combobox", { name: "Statut de traitement" }).click();
  await page.getByRole("option", { name: "Résolu", exact: true }).click();
  await review.getByLabel("Note interne").fill(note);
  await review.getByRole("button", { name: "Enregistrer le suivi" }).click();
  await expect(review).not.toBeVisible();
  await expect(row).toContainText("Résolu");
  await inbox.getByRole("combobox", { name: "Filtrer les avis par statut" }).click();
  await page.getByRole("option", { name: "Résolu", exact: true }).click();
  await expect(row).toBeVisible();
  const persisted = await page.request.get("/api/admin/feedback?status=resolved&page=1");
  expect(persisted.status()).toBe(200);
  const stored = (await persisted.json()).items.find((item: { message: string }) => item.message === message);
  expect(stored.status).toBe("resolved");
  expect(stored.admin_note).toBe(note);
  expect(stored.answer_excerpt).toBeNull();
  await row.getByRole("button", { name: /^Examiner/ }).click();
  await expect(review.getByLabel("Note interne")).toHaveValue(note);
  await page.keyboard.press("Escape");
  await expect(review).not.toBeVisible();
  await expect(row.getByRole("button", { name: /^Examiner/ })).toBeFocused();

  await inbox.getByRole("combobox", { name: "Filtrer les avis par statut" }).click();
  await page.getByRole("option", { name: "Tous les avis", exact: true }).click();
  await expect(inbox.getByRole("button", { name: "Suivant", exact: true })).toBeEnabled();
  await inbox.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(inbox).toContainText("Page 2 sur 2");
  await expect(inbox.getByRole("button", { name: "Précédent", exact: true })).toBeEnabled();
  await noOverflow(page);
  await page.getByRole("button", { name: "Déconnexion", exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/admin/login`);
  expect((await page.request.get("/api/admin/feedback")).status()).toBe(401);
});
