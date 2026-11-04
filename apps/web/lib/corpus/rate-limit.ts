export type CorpusRateLimitSubcode =
  | "global"
  | "agent_run"
  | "agent"
  | "search"
  | "corpus"
  | "unknown";

export type CorpusRateLimit = {
  subcode: CorpusRateLimitSubcode;
  message: string;
  retryAfterSeconds: number | null;
  limit: number | null;
  windowSeconds: number | null;
  status: number;
};

export type CorpusSurface = "catalogue" | "search" | "document" | "entity" | "atlas";

const SUBCODES = new Set<CorpusRateLimitSubcode>([
  "global",
  "agent_run",
  "agent",
  "search",
  "corpus",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : null;
}

function retryAfter(headers: Headers, body: Record<string, unknown> | null): number | null {
  const header = headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
    const date = Date.parse(header);
    if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }
  return integer(body?.retry_after);
}

function subcode(value: unknown): CorpusRateLimitSubcode {
  const normalized = typeof value === "string" ? value.replaceAll("-", "_") : "";
  return SUBCODES.has(normalized as CorpusRateLimitSubcode)
    ? normalized as CorpusRateLimitSubcode
    : "unknown";
}

/** Parse a corpus 429 body/headers without exposing transport details to pages. */
export function parseCorpusRateLimit(
  status: number,
  headers: Headers,
  body: unknown,
): CorpusRateLimit | null {
  const payload = record(body);
  const error = record(payload?.error);
  if (status !== 429 && !error?.subcode) return null;
  const code = subcode(error?.subcode ?? headers.get("x-ratelimit-subcode"));
  return {
    subcode: code,
    message: typeof error?.message === "string"
      ? error.message
      : "Le corpus reçoit trop de demandes. Réessayez dans quelques instants.",
    retryAfterSeconds: retryAfter(headers, error),
    limit: integer(error?.limit),
    windowSeconds: integer(error?.window_seconds),
    status,
  };
}

export function rateLimitTitle(rateLimit: CorpusRateLimit, surface: CorpusSurface): string {
  if (rateLimit.subcode === "global") return "Service momentanément saturé";
  if (surface === "search") {
    return rateLimit.subcode === "search"
      ? "Recherche par sens temporairement limitée"
      : "Recherche temporairement limitée";
  }
  if (surface === "document") return "Document temporairement limité";
  if (surface === "atlas") return "Atlas temporairement limité";
  if (surface === "entity") return "Fiche temporairement limitée";
  return "Catalogue temporairement limité";
}

export function rateLimitQuota(rateLimit: CorpusRateLimit): string | null {
  if (!rateLimit.limit || !rateLimit.windowSeconds) return null;
  const unit = rateLimit.subcode === "search" ? "recherche" : "requête";
  const period = rateLimit.windowSeconds === 60
    ? "minute"
    : rateLimit.windowSeconds === 3600
      ? "heure"
      : rateLimit.windowSeconds === 86400
        ? "jour"
        : `${rateLimit.windowSeconds} secondes`;
  return `Limite : ${rateLimit.limit} ${unit}${rateLimit.limit > 1 ? "s" : ""} par ${period}.`;
}
