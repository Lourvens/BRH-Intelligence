"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function WorkspaceHeader({ title, sourceCount, onOpenSources }: {
  title?: string;
  sourceCount: number;
  onOpenSources: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <SidebarTrigger aria-label="Ouvrir les conversations" className="size-10 rounded-sm text-ink-muted md:hidden" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Espace de recherche</p>
        <h1 className="truncate font-display text-small font-semibold text-navy-ink">{title ?? "Assistant documentaire"}</h1>
      </div>
      <span className="hidden border-l border-border pl-4 text-caption text-ink-muted sm:block">Démo locale</span>
      <Button type="button" variant="outline" onClick={onOpenSources} className="h-10 gap-2 rounded-sm border-border bg-surface px-3 text-caption text-navy-ink shadow-none xl:hidden">
        <BookOpen className="size-4" aria-hidden /> Sources ({sourceCount})
      </Button>
    </header>
  );
}
