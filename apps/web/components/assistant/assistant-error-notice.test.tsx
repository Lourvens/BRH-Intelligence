import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { AssistantError } from "@/lib/chat/assistant-error";
import { presentAssistantError } from "@/lib/chat/assistant-error-presentation";
import type { AssistantErrorActionHandlers } from "@/lib/chat/assistant-error-view";

import { AssistantErrorNotice } from "./assistant-error-notice";

const noop = () => undefined;

const handlers: AssistantErrorActionHandlers = {
  retry: noop,
  edit: noop,
  explore: noop,
  forget: noop,
  reload: noop,
  "new-thread": noop,
};

function render(
  partial: Partial<AssistantError> & Pick<AssistantError, "kind">,
  options: { remainingSeconds?: number; hasConversation?: boolean } = {},
) {
  const view = presentAssistantError({
    error: {
      message: "",
      retryAfterSeconds: null,
      status: null,
      subcode: null,
      limit: null,
      windowSeconds: null,
      ...partial,
    },
    remainingSeconds: options.remainingSeconds ?? 0,
    hasConversation: options.hasConversation ?? true,
    canForget: true,
  });
  return renderToStaticMarkup(
    <AssistantErrorNotice view={view} actions={handlers} />,
  );
}

test("rate-limit notice shows the countdown and disables retry", () => {
  const html = render(
    {
      kind: "rate_limit",
      message: "Limite de requêtes atteinte.",
      status: 429,
      subcode: "agent_run",
      limit: 6,
      windowSeconds: 60,
    },
    { remainingSeconds: 42 },
  );
  expect(html).toContain("Trop de questions en peu de temps");
  expect(html).toContain("Nouvelle tentative possible dans");
  expect(html).toContain("Réessayer dans 42 s");
  expect(html).toContain("disabled");
});

test("connection notice uses a direct retry", () => {
  const html = render({ kind: "connection" });
  expect(html).toContain("Connexion interrompue");
  expect(html).toContain("Réessayer");
  expect(html).not.toContain("Modifier la question");
  expect(html).not.toMatch(/\sdisabled(?:=""|\s|>)/);
});

test("daily quota shows a long reset and a corpus escape hatch", () => {
  const html = render(
    {
      kind: "rate_limit",
      message: "Votre quota quotidien est atteint.",
      status: 429,
      subcode: "daily_token_limit",
      limit: 100000,
      windowSeconds: 86400,
    },
    { remainingSeconds: 43200 },
  );
  expect(html).toContain("Quota quotidien atteint");
  expect(html).toContain("Nouveau quota disponible dans");
  expect(html).toContain("12 h");
  expect(html).toContain("Explorer le corpus");
  expect(html).not.toContain("Modifier la question");
  expect(html).toContain("disabled");
});

test("global limit has no edit CTA", () => {
  const html = render(
    {
      kind: "rate_limit",
      message: "Le service reçoit trop de demandes.",
      status: 429,
      subcode: "global",
      limit: 600,
      windowSeconds: 60,
    },
    { remainingSeconds: 30 },
  );
  expect(html).toContain("Service momentanément saturé");
  expect(html).not.toContain("Modifier la question");
});

test("a missing conversation offers a fresh start, never a retry", () => {
  const html = render({ kind: "not_found", status: 404, resource: "thread" });
  expect(html).toContain("Conversation introuvable");
  expect(html).toContain("Nouvelle conversation");
  expect(html).toContain("Retirer de l’historique");
  expect(html).not.toContain("Réessayer");
  expect(html).not.toMatch(/\sdisabled(?:=""|\s|>)/);
});

test("an outage notice keeps the retry action", () => {
  const html = render({ kind: "unavailable", status: 503 });
  expect(html).toContain("Service momentanément indisponible");
  expect(html).toContain("Réessayer");
  expect(html).not.toContain("Nouvelle conversation");
});
