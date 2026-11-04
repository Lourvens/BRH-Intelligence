import type { CorpusRateLimit } from "./rate-limit";

export class CorpusRequestError extends Error {
  constructor(
    public status: number,
    public rateLimit: CorpusRateLimit | null = null,
  ) {
    super(`Corpus request failed (${status})`);
  }
}
