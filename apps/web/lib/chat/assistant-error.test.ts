import { expect, test } from "bun:test";

import { normalizeAssistantError } from "./assistant-error";

test("429 keeps the server message and Retry-After", () => {
  const error = {
    status: 429,
    text: JSON.stringify({
      error: { code: "rate_limited", message: "Limite de requêtes atteinte." },
    }),
    response: {
      headers: {
        get: (name: string) => (name === "retry-after" ? "42" : null),
      },
    },
  };
  expect(normalizeAssistantError(error)).toEqual({
    kind: "rate_limit",
    message: "Limite de requêtes atteinte.",
    retryAfterSeconds: 42,
    status: 429,
  });
});

test("a rate limit without Retry-After falls back to one minute", () => {
  expect(normalizeAssistantError({ status: 429, text: "rate limited" })).toMatchObject({
    kind: "rate_limit",
    retryAfterSeconds: 60,
  });
});

test("connection failures stay separate from rate limits", () => {
  expect(normalizeAssistantError(new Error("Failed to fetch"))).toMatchObject({
    kind: "connection",
    retryAfterSeconds: null,
  });
});

test("unknown failures get a safe user-facing message", () => {
  expect(normalizeAssistantError(new Error("HTTP 500: upstream error"))).toMatchObject({
    kind: "unknown",
    message: "L’assistant est momentanément indisponible. Réessayez dans quelques instants.",
  });
});
