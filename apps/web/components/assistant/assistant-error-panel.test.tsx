import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { AssistantError } from "@/lib/chat/assistant-error";
import { presentAssistantError } from "@/lib/chat/assistant-error-presentation";
import type { AssistantErrorActionHandlers } from "@/lib/chat/assistant-error-view";

import { AssistantErrorPanel } from "./assistant-error-panel";

const noop = () => undefined;

const handlers: AssistantErrorActionHandlers = {
  retry: noop,
  edit: noop,
  explore: noop,
  forget: noop,
  reload: noop,
  "new-thread": noop,
};

function render(partial: Partial<AssistantError> & Pick<AssistantError, "kind">) {
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
    remainingSeconds: 0,
    hasConversation: false,
    canForget: true,
  });
  return renderToStaticMarkup(<AssistantErrorPanel view={view} actions={handlers} />);
}

test("the missing-conversation panel explains the error and its reference", () => {
  const html = render({ kind: "not_found", status: 404, resource: "thread" });
  expect(html).toContain("Conversation introuvable");
  expect(html).toContain("Erreur 404");
  expect(html).toContain("Nouvelle conversation");
  expect(html).toContain("Explorer le corpus");
  expect(html).toContain("Retirer de l’historique");
  expect(html).not.toContain("Réessayer");
});

test("the forbidden panel reloads instead of retrying the same request", () => {
  const html = render({ kind: "forbidden", status: 403 });
  expect(html).toContain("Accès refusé");
  expect(html).toContain("Erreur 403");
  expect(html).toContain("Recharger la page");
  expect(html).not.toContain("Réessayer");
});
