import type { AssistantError, RateLimitSubcode } from "./assistant-error";
import {
  retryAction,
  type AssistantErrorAction,
  type AssistantErrorView,
} from "./assistant-error-view";

const TITLES: Record<RateLimitSubcode, string> = {
  global: "Service momentanément saturé",
  agent_run: "Trop de questions en peu de temps",
  agent: "Trop de requêtes depuis cette session",
  search: "Recherche temporairement limitée",
  corpus: "Corpus temporairement limité",
  daily_token_limit: "Quota quotidien atteint",
  unknown: "Limite de requêtes atteinte",
};

const SUBCODES = new Set<RateLimitSubcode>(
  Object.keys(TITLES) as RateLimitSubcode[],
);

function codeOf(error: AssistantError): RateLimitSubcode {
  const code = error.kind === "rate_limit" ? error.subcode ?? "unknown" : "unknown";
  return SUBCODES.has(code) ? code : "unknown";
}

function description(error: AssistantError): string {
  if (error.message) return error.message;
  const code = codeOf(error);
  const scope = error.limit && error.windowSeconds
    ? ` (${error.limit} requêtes / ${error.windowSeconds} s)`
    : "";
  switch (code) {
    case "agent_run":
      return `Vous avez posé trop de questions en peu de temps${scope}. Réessayez dans quelques instants.`;
    case "agent":
      return `Cette session a envoyé trop de requêtes${scope}. Réessayez dans quelques instants.`;
    case "search":
      return "La recherche sémantique reçoit trop de demandes. Réessayez dans quelques instants.";
    case "corpus":
      return "Le corpus reçoit trop de demandes en ce moment. Réessayez dans quelques instants.";
    case "global":
      return "Le service reçoit trop de demandes en ce moment. Réessayez dans quelques instants.";
    case "daily_token_limit":
      return "Votre quota quotidien d’utilisation de l’assistant est atteint. Il se réinitialise à minuit UTC.";
    default:
      return "Limite de requêtes atteinte. Réessayez dans quelques instants.";
  }
}

function quota(error: AssistantError): string | null {
  const code = codeOf(error);
  if (!error.limit || !error.windowSeconds) return null;
  const unit = code === "daily_token_limit"
    ? "token"
    : code === "agent_run"
      ? "question"
      : code === "search"
        ? "recherche"
        : "requête";
  const period = error.windowSeconds === 60
    ? "minute"
    : error.windowSeconds === 3600
      ? "heure"
      : error.windowSeconds === 86400
        ? "jour"
        : `${error.windowSeconds} secondes`;
  return `Limite : ${error.limit} ${unit}${error.limit > 1 ? "s" : ""} par ${period}.`;
}

function waitingNote(error: AssistantError, waiting: boolean, waitLabel: string | null): string {
  if (!waiting) return "Vous pouvez réessayer maintenant.";
  const suffix = waitLabel ? ` dans ${waitLabel}` : "";
  return codeOf(error) === "daily_token_limit"
    ? `Nouveau quota disponible${suffix}.`
    : `Nouvelle tentative possible${suffix}.`;
}

/** The 429 surface: a quota has a countdown and a scoped edit/corpus escape. */
export function rateLimitView(
  error: AssistantError,
  waiting: boolean,
  waitLabel: string | null,
): AssistantErrorView {
  const code = codeOf(error);
  const dailyQuota = code === "daily_token_limit" && waiting;
  const actions: AssistantErrorAction[] = [
    retryAction(waiting, waitLabel, dailyQuota),
  ];
  if (code === "agent_run") {
    actions.push({ id: "edit", label: "Modifier la question", variant: "ghost" });
  }
  if (code === "daily_token_limit") {
    actions.push({ id: "explore", label: "Explorer le corpus", variant: "ghost" });
  }
  return {
    kind: error.kind,
    title: TITLES[code],
    description: description(error),
    code: error.status ? String(error.status) : null,
    icon: "timer",
    surface: "inline",
    actions,
    hideComposer: false,
    quota: quota(error),
    waiting,
    waitLabel,
    waitingNote: waitingNote(error, waiting, waitLabel),
  };
}
