"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";

export function WorkspaceHeader({ title, threadId, sourceCount, onOpenSources }: {
  title?: string;
  threadId: string | null;
  sourceCount: number;
  onOpenSources: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 bg-surface px-4 sm:px-6">
      <SidebarTrigger aria-label="Ouvrir les conversations" className="size-10 rounded-lg text-ink-muted md:hidden" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Espace de recherche</p>
        <h1 className="truncate font-display text-small font-semibold text-ink">{title ?? "Assistant documentaire"}</h1>
      </div>
      <FeedbackDialog threadId={threadId} compact />
      <Button type="button" variant="outline" onClick={onOpenSources} className="h-10 gap-2 rounded-lg border-border bg-surface px-3 text-caption text-ink shadow-none">
        <BookOpen className="size-4" aria-hidden /> Sources ({sourceCount})
      </Button>
    </header>
  );
}
