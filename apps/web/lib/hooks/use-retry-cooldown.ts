"use client";

import { useEffect, useState } from "react";

import type { AssistantError } from "@/lib/chat/assistant-error";

/** A stable per-error countdown derived from the server's Retry-After. */
export function useRetryCooldown(error: AssistantError | null): number {
  const [remaining, setRemaining] = useState(() =>
    error?.kind === "rate_limit" ? Math.max(0, error.retryAfterSeconds ?? 0) : 0,
  );

  useEffect(() => {
    const seconds = error?.kind === "rate_limit" ? Math.max(0, error.retryAfterSeconds ?? 0) : 0;
    setRemaining(seconds);
    if (seconds <= 0) return;
    const timer = window.setInterval(
      () => setRemaining((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [error]);

  return remaining;
}
