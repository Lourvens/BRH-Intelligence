"use client";

import { useEffect, useRef, useState } from "react";

export type ActionFeedbackState = "idle" | "pending" | "success" | "fallback" | "error";

export function useActionFeedback() {
  const [state, setState] = useState<ActionFeedbackState>("idle");
  const pending = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function run(action: () => Promise<"fallback" | void>) {
    if (pending.current) return;
    pending.current = true;
    if (timer.current) clearTimeout(timer.current);
    setState("pending");
    try {
      const result = await action();
      if (!mounted.current) return;
      setState(result === "fallback" ? "fallback" : "success");
      timer.current = setTimeout(() => setState("idle"), 2400);
    } catch (error) {
      if (!mounted.current) return;
      setState(error instanceof DOMException && error.name === "AbortError" ? "idle" : "error");
    } finally {
      pending.current = false;
    }
  }

  return { state, run };
}
