const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_BUCKETS = 1000;
const attempts = new Map<string, { count: number; reset: number }>();

export function allowLogin(key: string, now = Date.now()): boolean {
  for (const [identity, entry] of attempts) if (entry.reset <= now) attempts.delete(identity);
  const entry = attempts.get(key);
  if (entry) {
    entry.count += 1;
    return entry.count <= MAX_ATTEMPTS;
  }
  if (attempts.size >= MAX_BUCKETS) return false;
  attempts.set(key, { count: 1, reset: now + WINDOW_MS });
  return true;
}
