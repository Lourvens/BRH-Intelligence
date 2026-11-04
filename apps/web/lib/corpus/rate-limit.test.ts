import { expect, test } from "bun:test";

import { parseCorpusRateLimit, rateLimitQuota, rateLimitTitle } from "./rate-limit";

test("parses the corpus rate-limit body and headers", () => {
  const headers = new Headers({
    "retry-after": "42",
    "x-ratelimit-subcode": "search",
  });
  const result = parseCorpusRateLimit(429, headers, {
    error: {
      code: "rate_limited",
      subcode: "search",
      message: "La recherche sémantique reçoit trop de demandes.",
      limit: 10,
      window_seconds: 60,
    },
  });
  expect(result).toEqual({
    subcode: "search",
    message: "La recherche sémantique reçoit trop de demandes.",
    retryAfterSeconds: 42,
    limit: 10,
    windowSeconds: 60,
    status: 429,
  });
  expect(rateLimitQuota(result!)).toBe("Limite : 10 recherches par minute.");
  expect(rateLimitTitle(result!, "search")).toBe(
    "Recherche par sens temporairement limitée",
  );
});

test("corpus and global limits get surface-specific titles", () => {
  const corpus = parseCorpusRateLimit(429, new Headers(), {
    error: { subcode: "corpus", message: "Corpus limité." },
  });
  const global = parseCorpusRateLimit(429, new Headers(), {
    error: { subcode: "global", message: "Service saturé." },
  });
  expect(rateLimitTitle(corpus!, "document")).toBe("Document temporairement limité");
  expect(rateLimitTitle(corpus!, "atlas")).toBe("Atlas temporairement limité");
  expect(rateLimitTitle(global!, "catalogue")).toBe("Service momentanément saturé");
  expect(parseCorpusRateLimit(500, new Headers(), null)).toBeNull();
});
