"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { numberLabel } from "@/lib/corpus/labels";
import type { CorpusStats } from "@/lib/corpus/types";

const StatsContext = createContext<CorpusStats | null>(null);

export function CorpusStatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<CorpusStats | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/corpus/stats", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((value: CorpusStats | null) => { if (!controller.signal.aborted) setStats(value); })
      .catch(() => { /* Unavailable measurements stay unknown, never zero. */ });
    return () => controller.abort();
  }, []);
  return <StatsContext.Provider value={stats}>{children}</StatsContext.Provider>;
}

export function CorpusCount({ metric }: { metric: "discovered_urls" | "readable_documents" | "readable_pages" }) {
  const stats = useContext(StatsContext);
  return <span title={stats?.as_of ? `Mesuré le ${stats.as_of}` : "Mesure temporairement indisponible"}>{stats ? numberLabel(stats[metric]) : "—"}</span>;
}
