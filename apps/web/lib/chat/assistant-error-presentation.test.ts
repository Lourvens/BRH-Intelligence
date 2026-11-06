import { expect, test } from "bun:test";

import type { AssistantError } from "./assistant-error";
import { presentAssistantError } from "./assistant-error-presentation";

function assistantError(
  partial: Partial<AssistantError> & Pick<AssistantError, "kind">,
): AssistantError {
  return {
    message: "",
    retryAfterSeconds: null,
    status: null,
    subcode: null,
    limit: null,
    windowSeconds: null,
    ...partial,
  };
}

function view(
  partial: Partial<AssistantError> & Pick<AssistantError, "kind">,
  options: Partial<{
    remainingSeconds: number;
    hasConversation: boolean;
    canForget: boolean;
  }> = {},
) {
  return presentAssistantError({
    error: assistantError(partial),
    remainingSeconds: 0,
    hasConversation: false,
    canForget: false,
    ...options,
  });
}

test("a rate limit keeps its subcode title, cooldown and edit path", () => {
  const result = view(
    { kind: "rate_limit", status: 429, subcode: "agent_run", limit: 6, windowSeconds: 60 },
    { remainingSeconds: 42, hasConversation: true },
  );
  expect(result.title).toBe("Trop de questions en peu de temps");
  expect(result.surface).toBe("inline");
  expect(result.hideComposer).toBe(false);
  expect(result.waiting).toBe(true);
  expect(result.waitLabel).toBe("42 s");
  expect(result.actions.map((action) => action.id)).toEqual(["retry", "edit"]);
  expect(result.actions[0].label).toBe("Réessayer dans 42 s");
  expect(result.waitingNote).toBe("Nouvelle tentative possible dans 42 s.");
});

test("the daily quota keeps its long reset and corpus escape hatch", () => {
  const result = view(
    {
      kind: "rate_limit",
      status: 429,
      subcode: "daily_token_limit",
      limit: 100000,
      windowSeconds: 86400,
    },
    { remainingSeconds: 43200 },
  );
  expect(result.title).toBe("Quota quotidien atteint");
  expect(result.quota).toBe("Limite : 100000 tokens par jour.");
  expect(result.actions.map((action) => action.id)).toEqual(["retry", "explore"]);
  expect(result.actions[0].label).toBe("Quota dans 12 h");
  expect(result.waitingNote).toBe("Nouveau quota disponible dans 12 h.");
});

test("a missing conversation takes over the workspace and offers a fresh one", () => {
  const result = view({ kind: "not_found", status: 404, resource: "thread" });
  expect(result.title).toBe("Conversation introuvable");
  expect(result.surface).toBe("panel");
  expect(result.hideComposer).toBe(true);
  expect(result.code).toBe("404");
  expect(result.icon).toBe("message");
  expect(result.actions.map((action) => action.id)).toEqual(["new-thread", "explore"]);
  expect(result.actions[0].variant).toBe("default");
});

test("a stale local history entry can be removed from the panel", () => {
  const result = view(
    { kind: "not_found", status: 404, resource: "thread" },
    { canForget: true },
  );
  expect(result.actions.map((action) => action.id)).toEqual([
    "new-thread",
    "explore",
    "forget",
  ]);
});

test("a missing conversation stays inline when a transcript is on screen", () => {
  const result = view(
    { kind: "not_found", status: 404, resource: "thread" },
    { hasConversation: true },
  );
  expect(result.surface).toBe("inline");
  expect(result.actions.map((action) => action.id)).not.toContain("retry");
});

test("a missing assistant is a service problem, not a retryable turn", () => {
  const result = view({ kind: "not_found", status: 404, resource: "assistant" });
  expect(result.title).toBe("Assistant introuvable");
  expect(result.actions.map((action) => action.id)).toEqual(["reload"]);
  expect(result.hideComposer).toBe(true);
  expect(result.surface).toBe("panel");
});

test("a missing run can be retried without leaving the conversation", () => {
  const result = view({ kind: "not_found", status: 404, resource: "run" });
  expect(result.title).toBe("Réponse introuvable");
  expect(result.surface).toBe("inline");
  expect(result.hideComposer).toBe(false);
  expect(result.actions.map((action) => action.id)).toEqual(["retry", "new-thread"]);
});

test("an unreachable service address offers a retry and a reload", () => {
  const result = view({ kind: "not_found", status: 404, resource: "service" });
  expect(result.title).toBe("Service introuvable");
  expect(result.surface).toBe("panel");
  expect(result.actions.map((action) => action.id)).toEqual(["retry", "reload"]);
});

test("access failures ask for a reload instead of a retry loop", () => {
  const result = view({ kind: "forbidden", status: 403 });
  expect(result.title).toBe("Accès refusé");
  expect(result.surface).toBe("panel");
  expect(result.hideComposer).toBe(true);
  expect(result.code).toBe("403");
  expect(result.actions.map((action) => action.id)).toEqual(["reload"]);
});

test("a refused request returns the user to the composer", () => {
  const result = view({ kind: "invalid", status: 422 });
  expect(result.title).toBe("Question refusée");
  expect(result.surface).toBe("inline");
  expect(result.hideComposer).toBe(false);
  expect(result.actions.map((action) => action.id)).toEqual(["edit"]);
});

test("an outage stays retryable, inline, with the composer available", () => {
  const result = view({ kind: "unavailable", status: 503 });
  expect(result.title).toBe("Service momentanément indisponible");
  expect(result.surface).toBe("inline");
  expect(result.hideComposer).toBe(false);
  expect(result.actions.map((action) => action.id)).toEqual(["retry"]);
  expect(result.waitingNote).toBeNull();

  const cooled = view(
    { kind: "unavailable", status: 503, retryAfterSeconds: 30 },
    { remainingSeconds: 30 },
  );
  expect(cooled.actions[0].label).toBe("Réessayer dans 30 s");
});

test("a dropped connection asks for a retry after checking the network", () => {
  const result = view({ kind: "connection" });
  expect(result.title).toBe("Connexion interrompue");
  expect(result.actions.map((action) => action.id)).toEqual(["retry"]);
  expect(result.actions[0].label).toBe("Réessayer");
});

test("an unclassified failure still offers a retry and a reload", () => {
  const result = view({ kind: "unknown" });
  expect(result.title).toBe("Demande interrompue");
  expect(result.actions.map((action) => action.id)).toEqual(["retry", "reload"]);
  expect(result.code).toBeNull();
});
