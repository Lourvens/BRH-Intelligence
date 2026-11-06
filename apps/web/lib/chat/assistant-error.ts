export type AssistantErrorKind =
  | "rate_limit"
  | "connection"
  | "not_found"
  | "forbidden"
  | "invalid"
  | "unavailable"
  | "unknown";

export type RateLimitSubcode =
  | "global"
  | "agent_run"
  | "agent"
  | "search"
  | "corpus"
  | "daily_token_limit"
  | "unknown";

/** What a 404 was about; the presentation layer keys its copy on this. */
export type NotFoundResource = "thread" | "assistant" | "run" | "service";

export type AssistantError = {
  kind: AssistantErrorKind;
  /**
   * Server-provided text, kept only when it is safe to display. The copy for
   * every other kind is owned by the presentation layer.
   */
  message: string;
  retryAfterSeconds: number | null;
  status: number | null;
  subcode: RateLimitSubcode | null;
  limit: number | null;
  windowSeconds: number | null;
  /** Present for `not_found` only; defaults to the conversation when unknown. */
  resource?: NotFoundResource;
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
  "daily_token_limit",
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

function parseBody(text: string): Record<string, unknown> | null {
  try {
    return record(JSON.parse(text));
  } catch {
    return null;
  }
}

function payload(error: Record<string, unknown> | null): ErrorPayload | null {
  const parsed = parseBody(errorText(error));
  return record(parsed?.error) as ErrorPayload | null;
}

/** The `detail` string of a FastAPI/LangGraph error body, when there is one. */
function serverDetail(error: Record<string, unknown> | null): string | null {
  const parsed = parseBody(errorText(error));
  if (!parsed) return null;
  for (const key of ["detail", "message"]) {
    const value = parsed[key];
    if (typeof value === "string") return value;
    const nested = record(value);
    if (typeof nested?.message === "string") return nested.message;
  }
  return null;
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

function isRateLimited(status: number | null, body: ErrorPayload | null, text: string): boolean {
  return status === 429
    || body?.subcode !== undefined
    || /rate.?limit|limite de requ[êe]tes/i.test(text);
}

function isConnection(error: Record<string, unknown> | null, text: string): boolean {
  if (error?.name === "ConnectionError") return true;
  return /failed to fetch|unable to connect|networkerror|connexion/i.test(text);
}

/*
 * HTTP status is authoritative when present. Text fallbacks exist because the
 * SDK sometimes wraps a response as `Error("Failed to stream: Not Found")`
 * with no status attached.
 */
function isNotFound(status: number | null, text: string): boolean {
  if (status === 404) return true;
  return status == null && /not found|introuvable|\b404\b/i.test(text);
}

function isForbidden(status: number | null, text: string): boolean {
  if (status === 401 || status === 403) return true;
  return status == null && /unauthorized|forbidden|acc[èe]s refus/i.test(text);
}

function isInvalid(status: number | null, text: string): boolean {
  const refused = status === 400 || status === 405 || status === 406
    || status === 413 || status === 415 || status === 422;
  return refused
    || (status == null && /bad request|unprocessable|invalid request|payload too large/i.test(text));
}

function isUnavailable(status: number | null, text: string): boolean {
  if (status === 408 || status === 425 || (status !== null && status >= 500)) return true;
  return status == null
    && (/internal server error|bad gateway|service unavailable|gateway time-?out|timed out/i.test(text)
      || /\bhttp 5\d\d\b/i.test(text));
}

function notFoundResource(
  detail: string | null,
  text: string,
  hasThread: boolean,
): NotFoundResource {
  const hint = `${detail ?? ""} ${text}`.toLowerCase();
  if (/assistant|graph|deployment/.test(hint)) return "assistant";
  if (/thread|conversation/.test(hint)) return "thread";
  if (/\bruns?\b/.test(hint)) return "run";
  // A bare "Not Found" is most often the conversation the URL names.
  return hasThread ? "thread" : "service";
}

/**
 * Turn an SDK/HTTP error into the user-facing assistant error contract.
 * `hasThread` disambiguates a bare 404: an unknown thread when a conversation
 * was open, an unknown endpoint on a fresh page.
 */
export function normalizeAssistantError(
  value: unknown,
  context: { hasThread?: boolean } = {},
): AssistantError {
  const error = record(value);
  const status = errorStatus(error);
  const text = errorText(error);
  const body = payload(error);
  const base = {
    message: "",
    status,
    subcode: null,
    limit: null,
    windowSeconds: null,
  } as const;

  if (isRateLimited(status, body, text)) {
    return {
      ...base,
      kind: "rate_limit",
      message: body?.message ?? "",
      retryAfterSeconds: retryAfter(error, body) ?? DEFAULT_RATE_LIMIT_RETRY_SECONDS,
      subcode: subcode(body) ?? "unknown",
      limit: numberValue(body?.limit),
      windowSeconds: numberValue(body?.window_seconds),
    };
  }

  const retryAfterSeconds = retryAfter(error, body);

  if (isNotFound(status, text)) {
    return {
      ...base,
      kind: "not_found",
      retryAfterSeconds,
      resource: notFoundResource(serverDetail(error), text, context.hasThread ?? false),
    };
  }
  if (isForbidden(status, text)) {
    return { ...base, kind: "forbidden", retryAfterSeconds };
  }
  if (isInvalid(status, text)) {
    return { ...base, kind: "invalid", retryAfterSeconds };
  }
  if (isUnavailable(status, text)) {
    return { ...base, kind: "unavailable", retryAfterSeconds };
  }
  return {
    ...base,
    kind: isConnection(error, text) ? "connection" : "unknown",
    retryAfterSeconds,
  };
}
