import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CorpusRateLimitNotice } from "./corpus-rate-limit-notice";

test("corpus notice shows surface copy, quota and disabled countdown", () => {
  const html = renderToStaticMarkup(
    <CorpusRateLimitNotice
      rateLimit={{
        subcode: "corpus",
        message: "Le corpus reçoit trop de demandes.",
        retryAfterSeconds: 30,
        limit: 120,
        windowSeconds: 60,
        status: 429,
      }}
      surface="atlas"
      onRetry={() => undefined}
      secondaryAction={{ label: "Explorer les publications", onClick: () => undefined }}
    />,
  );
  expect(html).toContain("Atlas temporairement limité");
  expect(html).toContain("Limite : 120 requêtes par minute.");
  expect(html).toContain("Réessayer dans 30 s");
  expect(html).toContain("Explorer les publications");
  expect(html).toContain("disabled");
});

test("search notice can offer a metadata-search escape hatch", () => {
  const html = renderToStaticMarkup(
    <CorpusRateLimitNotice
      rateLimit={{
        subcode: "search",
        message: "La recherche par sens est limitée.",
        retryAfterSeconds: 10,
        limit: 10,
        windowSeconds: 60,
        status: 429,
      }}
      surface="search"
      onRetry={() => undefined}
      secondaryAction={{ label: "Rechercher par titre", onClick: () => undefined }}
    />,
  );
  expect(html).toContain("Recherche par sens temporairement limitée");
  expect(html).toContain("Rechercher par titre");
});
