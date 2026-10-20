"use client";

import { BookOpen, ChartLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function ChatHeader({
  citationCount,
  onOpenSources,
}: {
  citationCount: number;
  onOpenSources: () => void;
}) {
  const sourcesLabel = `Sources (${citationCount})`;

  return (
    <header className="flex h-14 min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <SidebarTrigger
          aria-label="Afficher ou masquer les conversations"
          className="size-9 shrink-0 text-ink-muted hover:bg-surface-alt md:hidden"
        />
        <span className="hidden size-7 shrink-0 place-items-center rounded border border-gold/30 bg-navy text-gold sm:grid">
          <ChartLine className="size-3.5" aria-hidden />
        </span>
        <p className="min-w-0 truncate text-[10px] font-medium text-ink-muted">
          Agent documentaire · publications officielles de la BRH
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Badge
          variant="outline"
          className="rounded border-gold/50 bg-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-ink"
        >
          Démo
        </Badge>
        <Badge
          variant="outline"
          className="hidden rounded border-border bg-surface px-2.5 py-0.5 text-[10px] font-medium text-ink-muted md:inline-flex"
        >
          Archive 2018—2026
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenSources}
          className="gap-1.5 rounded border-gold/40 bg-gold/10 px-2.5 text-[11px] font-medium text-navy hover:bg-gold/20 xl:hidden"
        >
          <BookOpen className="size-3.5 text-teal" aria-hidden />
          {sourcesLabel}
        </Button>
        <span className="hidden items-center gap-1.5 rounded border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-navy xl:inline-flex">
          <BookOpen className="size-3.5 text-teal" aria-hidden />
          {sourcesLabel}
        </span>
      </div>
    </header>
  );
}
