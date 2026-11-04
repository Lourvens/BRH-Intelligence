import { expect, test } from "bun:test";

import { normalizeAssistantError, rateLimitPresentation } from "./assistant-error";

test("429 keeps the server message and Retry-After", () => {
  const error = {
    status: 429,
    text: JSON.stringify({
      error: {
        code: "rate_limited",
        subcode: "agent_run",
        message: "Limite de requêtes atteinte.",
        limit: 6,
        window_seconds: 60,
        retry_after: 42,
      },
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
    subcode: "agent_run",
    limit: 6,
    windowSeconds: 60,
  });
});

test("a rate limit without Retry-After falls back to one minute", () => {
  expect(normalizeAssistantError({ status: 429, text: "rate limited" })).toMatchObject({
    kind: "rate_limit",
    retryAfterSeconds: 60,
    subcode: "unknown",
  });
});

test("connection failures stay separate from rate limits", () => {
  expect(normalizeAssistantError(new Error("Failed to fetch"))).toMatchObject({
    kind: "connection",
    retryAfterSeconds: null,
    subcode: null,
  });
});

test("unknown failures get a safe user-facing message", () => {
  expect(normalizeAssistantError(new Error("HTTP 500: upstream error"))).toMatchObject({
    kind: "unknown",
    message: "L’assistant est momentanément indisponible. Réessayez dans quelques instants.",
    subcode: null,
  });
});


test("each backend subcode maps to its own title and edit policy", () => {
  const base = { kind: "rate_limit" as const, message: "", retryAfterSeconds: 30,
    status: 429, limit: 6, windowSeconds: 60 };
  expect(rateLimitPresentation({ ...base, subcode: "agent_run" })).toMatchObject({
    title: "Trop de questions en peu de temps", showEdit: true,
  });
  expect(rateLimitPresentation({ ...base, subcode: "global" })).toMatchObject({
    title: "Service momentanément saturé", showEdit: false,
  });
  expect(rateLimitPresentation({ ...base, subcode: "search" })).toMatchObject({
    title: "Recherche temporairement limitée", showEdit: false,
  });
});
