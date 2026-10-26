"use client";

import { useEffect, useState } from "react";

export function useCorpusSearch(initialMode: string) {
  const [mode, setMode] = useState(initialMode);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const restore = () => setPending(false);
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  function submit() { setPending(true); }
  return { mode, setMode, pending, submit };
}
