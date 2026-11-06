import { expect, test } from "bun:test";

import { normalizeAssistantError } from "./assistant-error";

/** The shape `@langchain/langgraph-sdk` rejects with: an HTTPError carrying the body. */
function httpError(status: number, body: string) {
  return { status, text: body, message: `HTTP ${status}: ${body}` };
}

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

test("a 404 names the conversation that no longer exists", () => {
  const error = normalizeAssistantError(
    httpError(404, '{"detail":"Thread not found"}'),
    { hasThread: true },
  );
  expect(error).toMatchObject({
    kind: "not_found",
    status: 404,
    resource: "thread",
    retryAfterSeconds: null,
    subcode: null,
  });
  // Server text is never shown for a missing destination; copy is owned by the
  // presentation layer.
  expect(error.message).toBe("");
});

test("a 404 separates a missing assistant from a missing conversation", () => {
  expect(normalizeAssistantError(httpError(404, '{"detail":"Assistant not found"}')))
    .toMatchObject({ kind: "not_found", resource: "assistant" });
  expect(normalizeAssistantError(httpError(404, '{"detail":"Run not found"}')))
    .toMatchObject({ kind: "not_found", resource: "run" });
});

test("a bare 404 falls back to the thread only when one is open", () => {
  const statusText = new Error("Failed to stream: Not Found");
  expect(normalizeAssistantError(statusText, { hasThread: true }))
    .toMatchObject({ kind: "not_found", status: null, resource: "thread" });
  expect(normalizeAssistantError(statusText, { hasThread: false }))
    .toMatchObject({ kind: "not_found", resource: "service" });
});

test("401 and 403 are access failures, not outages", () => {
  expect(normalizeAssistantError(httpError(401, '{"detail":"Unauthorized"}')))
    .toMatchObject({ kind: "forbidden", status: 401 });
  expect(normalizeAssistantError({ status: 403 })).toMatchObject({
    kind: "forbidden",
    status: 403,
  });
});

test("a refused request is distinct from an outage", () => {
  expect(normalizeAssistantError(httpError(422, '{"detail":"Invalid input"}')))
    .toMatchObject({ kind: "invalid", status: 422 });
  expect(normalizeAssistantError(httpError(413, "Payload Too Large")))
    .toMatchObject({ kind: "invalid", status: 413 });
});

test("5xx and timeouts are transient outages", () => {
  expect(normalizeAssistantError(httpError(503, '{"detail":"unavailable"}')))
    .toMatchObject({ kind: "unavailable", status: 503 });
  expect(normalizeAssistantError(httpError(504, "Gateway Timeout")))
    .toMatchObject({ kind: "unavailable", status: 504 });
  expect(normalizeAssistantError(new Error("HTTP 500: upstream error")))
    .toMatchObject({ kind: "unavailable" });
});

test("a Retry-After on an outage becomes a cooldown", () => {
  const error = {
    status: 503,
    text: '{"detail":"unavailable"}',
    response: {
      headers: { get: (name: string) => (name === "retry-after" ? "30" : null) },
    },
  };
  expect(normalizeAssistantError(error)).toMatchObject({
    kind: "unavailable",
    retryAfterSeconds: 30,
  });
});

test("connection failures stay separate from rate limits", () => {
  expect(normalizeAssistantError(new Error("Failed to fetch"))).toMatchObject({
    kind: "connection",
    retryAfterSeconds: null,
    subcode: null,
  });
  expect(normalizeAssistantError({ name: "ConnectionError" })).toMatchObject({
    kind: "connection",
  });
});

test("unknown failures stay unknown instead of becoming outages", () => {
  expect(normalizeAssistantError(new Error("boom"))).toMatchObject({
    kind: "unknown",
    status: null,
    subcode: null,
  });
});
