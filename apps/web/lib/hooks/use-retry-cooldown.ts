"use client";

import type { AssistantError } from "@/lib/chat/assistant-error";
import { useCountdown } from "@/lib/hooks/use-countdown";

/** A stable per-error countdown derived from the server's Retry-After. */
export function useRetryCooldown(error: AssistantError | null): number {
  return useCountdown(
    error?.kind === "rate_limit" ? error.retryAfterSeconds : null,
    error,
  );
}
