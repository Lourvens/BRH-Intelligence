"use client";

import type { AssistantError } from "@/lib/chat/assistant-error";
import { useCountdown } from "@/lib/hooks/use-countdown";

/**
 * A stable per-error countdown derived from the server's Retry-After. Rate
 * limits and 503-style outages both carry one; other failures start at zero.
 */
export function useRetryCooldown(error: AssistantError | null): number {
  return useCountdown(error?.retryAfterSeconds ?? null, error);
}
