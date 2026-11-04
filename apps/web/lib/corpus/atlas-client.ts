import { CorpusRequestError } from "./errors";
import { parseCorpusRateLimit } from "./rate-limit";

export async function readAtlas<T>(
  url: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(url, { signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CorpusRequestError(
      response.status,
      parseCorpusRateLimit(response.status, response.headers, body),
    );
  }
  return body as T;
}
