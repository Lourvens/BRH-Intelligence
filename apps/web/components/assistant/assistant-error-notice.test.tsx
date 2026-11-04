import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AssistantErrorNotice } from "./assistant-error-notice";

test("rate-limit notice shows the countdown and disables retry", () => {
  const html = renderToStaticMarkup(
    <AssistantErrorNotice
      error={{
        kind: "rate_limit",
        message: "Limite de requêtes atteinte.",
        retryAfterSeconds: 42,
        status: 429,
        subcode: "agent_run",
        limit: 6,
        windowSeconds: 60,
      }}
      remainingSeconds={42}
      onRetry={() => undefined}
      onEdit={() => undefined}
    />,
  );
  expect(html).toContain("Trop de questions en peu de temps");
  expect(html).toContain("Nouvelle tentative possible dans");
  expect(html).toContain("Réessayer dans 42 s");
  expect(html).toContain("disabled");
});

test("connection notice uses a direct retry", () => {
  const html = renderToStaticMarkup(
    <AssistantErrorNotice
      error={{
        kind: "connection",
        message: "Impossible de joindre l’assistant.",
        retryAfterSeconds: null,
        status: null,
        subcode: null,
        limit: null,
        windowSeconds: null,
      }}
      remainingSeconds={0}
      onRetry={() => undefined}
      onEdit={() => undefined}
    />,
  );
  expect(html).toContain("Connexion interrompue");
  expect(html).toContain("Réessayer");
  expect(html).not.toContain("Modifier la question");
  expect(html).not.toMatch(/\sdisabled(?:=""|\s|>)/);
});


test("global limit has no edit CTA", () => {
  const html = renderToStaticMarkup(
    <AssistantErrorNotice
      error={{
        kind: "rate_limit",
        message: "Le service reçoit trop de demandes.",
        retryAfterSeconds: 30,
        status: 429,
        subcode: "global",
        limit: 600,
        windowSeconds: 60,
      }}
      remainingSeconds={30}
      onRetry={() => undefined}
      onEdit={() => undefined}
    />,
  );
  expect(html).toContain("Service momentanément saturé");
  expect(html).not.toContain("Modifier la question");
});
