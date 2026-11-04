"use client";

import { useEffect, useState } from "react";

/** Count down a Retry-After window; resetKey restarts on a new error object. */
export function useCountdown(seconds: number | null, resetKey?: unknown): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, seconds ?? 0));

  useEffect(() => {
    const start = Math.max(0, seconds ?? 0);
    setRemaining(start);
    if (start <= 0) return;
    const timer = window.setInterval(
      () => setRemaining((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [seconds, resetKey]);

  return remaining;
}
