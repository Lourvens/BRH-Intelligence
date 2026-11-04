export type AssistantErrorKind = "rate_limit" | "connection" | "unknown";

export type AssistantError = {
  kind: AssistantErrorKind;
  message: string;
  retryAfterSeconds: number | null;
  status: number | null;
};

const DEFAULT_RATE_LIMIT_RETRY_SECONDS = 60;

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

function retryAfter(error: Record<string, unknown> | null): number | null {
  const response = record(error?.response);
  const headers = record(response?.headers);
  const value = headers?.get;
  if (typeof value !== "function") return null;
  const header = (value as (name: string) => string | null).call(headers, "retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function payloadMessage(text: string): string | null {
  try {
    const payload = JSON.parse(text) as { error?: { message?: unknown } };
    return typeof payload.error?.message === "string" ? payload.error.message : null;
  } catch {
    return null;
  }
}

/** Turn an SDK/HTTP error into the user-facing assistant error contract. */
export function normalizeAssistantError(value: unknown): AssistantError {
  const error = record(value);
  const status = errorStatus(error);
  const text = errorText(error);
  const message = payloadMessage(text);
  const rateLimited = status === 429 || /rate.?limit|limite de requ[êe]tes/i.test(text);
  if (rateLimited) {
    return {
      kind: "rate_limit",
      message: message ?? "Vous avez envoyé trop de questions. Réessayez dans quelques instants.",
      retryAfterSeconds: retryAfter(error) ?? DEFAULT_RATE_LIMIT_RETRY_SECONDS,
      status,
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
  };
}
