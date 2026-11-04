export type AssistantErrorKind = "rate_limit" | "connection" | "unknown";

export type RateLimitSubcode =
  | "global"
  | "agent_run"
  | "agent"
  | "search"
  | "corpus"
  | "unknown";

export type AssistantError = {
  kind: AssistantErrorKind;
  message: string;
  retryAfterSeconds: number | null;
  status: number | null;
  subcode: RateLimitSubcode | null;
  limit: number | null;
  windowSeconds: number | null;
};

type ErrorPayload = {
  message?: string;
  subcode?: string;
  limit?: number;
  window_seconds?: number;
  retry_after?: number;
};

const DEFAULT_RATE_LIMIT_RETRY_SECONDS = 60;
const RATE_LIMIT_SUBCODES = new Set<RateLimitSubcode>([
  "global",
  "agent_run",
  "agent",
  "search",
  "corpus",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function errorText(error: Record<string, unknown> | null): string {
  if (!error) return "";
  for (const key of ["text", "message"]) {
    const value = error[key];
    if (typeof value === "string") return value;
  }
  return "";
}

function errorStatus(error: Record<string, unknown> | null): number | null {
  if (!error) return null;
  const direct = error.status;
  if (typeof direct === "number") return direct;
  const response = record(error.response);
  return typeof response?.status === "number" ? response.status : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function payload(error: Record<string, unknown> | null): ErrorPayload | null {
  const text = errorText(error);
  try {
    const parsed = record(JSON.parse(text));
    return record(parsed?.error) as ErrorPayload | null;
  } catch {
    return null;
  }
}

function retryAfter(error: Record<string, unknown> | null, body: ErrorPayload | null): number | null {
  const response = record(error?.response);
  const headers = record(response?.headers);
  const get = headers?.get;
  if (typeof get === "function") {
    const header = (get as (name: string) => string | null).call(headers, "retry-after");
    if (header) {
      const seconds = Number(header);
      if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
      const date = Date.parse(header);
      if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
    }
  }
  const bodyRetry = body?.retry_after;
  return typeof bodyRetry === "number" ? Math.max(0, Math.ceil(bodyRetry)) : null;
}

function subcode(body: ErrorPayload | null): RateLimitSubcode | null {
  const value = typeof body?.subcode === "string"
    ? body.subcode.replaceAll("-", "_") as RateLimitSubcode
    : undefined;
  return value && RATE_LIMIT_SUBCODES.has(value) ? value : null;
}

function rateLimitMessage(body: ErrorPayload | null, code: RateLimitSubcode): string {
  if (body?.message) return body.message;
  const limit = body?.limit;
  const window = body?.window_seconds;
  const scope = limit && window ? ` (${limit} requêtes / ${window} s)` : "";
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
    default:
      return "Limite de requêtes atteinte. Réessayez dans quelques instants.";
  }
}

/** Turn an SDK/HTTP error into the user-facing assistant error contract. */
export function normalizeAssistantError(value: unknown): AssistantError {
  const error = record(value);
  const status = errorStatus(error);
  const text = errorText(error);
  const body = payload(error);
  const rateLimited = status === 429
    || body?.subcode !== undefined
    || /rate.?limit|limite de requ[êe]tes/i.test(text);
  if (rateLimited) {
    const code = subcode(body) ?? "unknown";
    return {
      kind: "rate_limit",
      message: rateLimitMessage(body, code),
      retryAfterSeconds: retryAfter(error, body) ?? DEFAULT_RATE_LIMIT_RETRY_SECONDS,
      status,
      subcode: code,
      limit: numberValue(body?.limit),
      windowSeconds: numberValue(body?.window_seconds),
    };
  }
  const connection = /failed to fetch|unable to connect|networkerror|connexion/i.test(text)
    || error?.name === "ConnectionError";
  return {
    kind: connection ? "connection" : "unknown",
    message: connection
      ? "Impossible de joindre l’assistant. Vérifiez la connexion et réessayez."
      : "L’assistant est momentanément indisponible. Réessayez dans quelques instants.",
    retryAfterSeconds: null,
    status,
    subcode: null,
    limit: null,
    windowSeconds: null,
  };
}

const RATE_LIMIT_TITLES: Record<RateLimitSubcode, string> = {
  global: "Service momentanément saturé",
  agent_run: "Trop de questions en peu de temps",
  agent: "Trop de requêtes depuis cette session",
  search: "Recherche temporairement limitée",
  corpus: "Corpus temporairement limité",
  unknown: "Limite de requêtes atteinte",
};

/** UI copy and action policy for each backend rate-limit subcode. */
export function rateLimitPresentation(error: AssistantError): {
  title: string;
  showEdit: boolean;
  quota: string | null;
} {
  const code = error.kind === "rate_limit" ? error.subcode ?? "unknown" : "unknown";
  const window = error.windowSeconds;
  const unit = code === "agent_run" ? "question" : code === "search" ? "recherche" : "requête";
  const period = window === 60
    ? "minute"
    : window === 3600
      ? "heure"
      : window === 86400
        ? "jour"
        : window
          ? `${window} secondes`
          : null;
  return {
    title: RATE_LIMIT_TITLES[code],
    showEdit: code === "agent_run",
    quota: error.limit && period
      ? `Limite : ${error.limit} ${unit}${error.limit > 1 ? "s" : ""} par ${period}.`
      : null,
  };
}
