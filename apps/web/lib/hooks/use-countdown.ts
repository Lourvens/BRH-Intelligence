"use client";

import { useEffect, useState } from "react";

/** Count down a Retry-After window; resetKey restarts on a new error object. */
export function useCountdown(seconds: number | null, resetKey?: unknown): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, seconds ?? 0));

  useEffect(() => {
    const start = Math.max(0, seconds ?? 0);
    setRemaining(start);
    if (start <= 0) return;
    // A daily quota can be hours away. Tick coarsely so the whole workspace
    // does not re-render every second; short windows keep second precision.
    const tickMs = start > 120 ? 30_000 : 1_000;
    const step = tickMs / 1000;
    const timer = window.setInterval(
      () => setRemaining((current) => Math.max(0, current - step)),
      tickMs,
    );
    return () => window.clearInterval(timer);
  }, [seconds, resetKey]);

  return remaining;
}
