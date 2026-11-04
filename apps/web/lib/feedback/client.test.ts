import { afterEach, expect, spyOn, test } from "bun:test";
import { submitFeedback } from "./client";
import { feedbackMessageError, type FeedbackInput } from "./types";

const input: FeedbackInput = {
  category: "bug",
  message: "  La page ne se charge pas correctement.  ",
  page_path: "/assistant",
  answer_excerpt: null,
};

let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;

afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = undefined;
});

test("rejects blank or underspecified feedback before any network call", async () => {
  fetchSpy = spyOn(globalThis, "fetch");
  await expect(submitFeedback({ ...input, message: "          " })).rejects.toThrow("au moins 10 caractères");
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(feedbackMessageError("x".repeat(4001))).toContain("au plus 4 000");
});

test("sends trimmed feedback without attaching any conversation content by default", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "feedback-123" }, { status: 201 }));
  expect(await submitFeedback(input)).toEqual({ id: "feedback-123" });
  const [url, options] = fetchSpy.mock.calls[0];
  expect(url).toBe("/api/feedback");
  expect(options?.method).toBe("POST");
  const payload = JSON.parse(options?.body as string);
  expect(payload.message).toBe("La page ne se charge pas correctement.");
  expect(payload.answer_excerpt).toBeNull();
  expect(payload).not.toHaveProperty("messages");
});

test("explains rate limits without reporting an unsaved message as received", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "limited" }, { status: 429 }));
  await expect(submitFeedback(input)).rejects.toThrow("Patientez quelques minutes");
});

test("rejects unavailable storage and malformed successful responses", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "database unavailable" }, { status: 503 }));
  await expect(submitFeedback(input)).rejects.toThrow("Votre texte est conservé");
  fetchSpy.mockResolvedValue(Response.json({ accepted: true }));
  await expect(submitFeedback(input)).rejects.toThrow("Votre texte est conservé");
});

test("presents connection errors in French and leaves the input intact", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(submitFeedback(input)).rejects.toThrow("La connexion a échoué");
  expect(input.message).toBe("  La page ne se charge pas correctement.  ");
});
