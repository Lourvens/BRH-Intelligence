"use client";

import { FileSearch, PanelRightClose, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { uniqueCitations } from "@/lib/chat/citations";
import type { ChatCitation } from "@/lib/chat/types";

import { SourceDetail } from "./source-detail";
import { SourceList } from "./source-list";

export function SourcesPanel({
  citations,
  selected,
  onSelect,
  onClose,
  onCollapse,
}: {
  citations: readonly ChatCitation[];
  selected: ChatCitation | null;
  onSelect: (citationId: string) => void;
  onClose?: () => void;
  onCollapse?: () => void;
}) {
  const unique = uniqueCitations(citations);

  return (
    <div className="flex h-full w-full min-w-0 shrink-0 flex-col overflow-hidden bg-surface">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div>
          <h2 className="font-display text-caption font-bold text-navy-ink">
            Sources documentaires
          </h2>
          <p className="text-[10px] text-ink-muted">
            {unique.length
              ? `${unique.length} référence${unique.length > 1 ? "s" : ""} active${unique.length > 1 ? "s" : ""}`
              : "Aucune référence"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onCollapse ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onCollapse}
                  aria-label="Replier les sources"
                  className="text-ink-muted transition-[background-color,color,transform] duration-150 hover:bg-surface-alt hover:text-navy-ink active:scale-95 motion-reduce:transition-none"
                >
                  <PanelRightClose className="size-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Replier les sources</TooltipContent>
            </Tooltip>
          ) : null}
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Fermer les sources"
              className="text-ink-muted transition-[background-color,color,transform] duration-150 hover:bg-surface-alt hover:text-navy-ink active:scale-95 motion-reduce:transition-none xl:hidden"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {!selected ? (
        <div className="flex w-full flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-surface-alt text-teal">
            <FileSearch className="size-6" aria-hidden />
          </div>
          <p className="font-display text-small font-bold text-navy-ink">
            Les sources apparaîtront ici
          </p>
          <p className="mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-ink-muted">
            Chaque réponse renvoie à un document et à une page du corpus.
          </p>
        </div>
      ) : (
        <ScrollArea
          type="always"
          className="min-h-0 w-full flex-1 overscroll-contain [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden"
        >
          <div className="w-full min-w-0 max-w-full overflow-hidden pb-6 pl-4 pr-6 pt-4">
            <SourceDetail key={selected.id} citation={selected} />

            {unique.length > 1 ? (
              <div className="mt-5 w-full min-w-0">
                <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Toutes les sources
                </div>
                <SourceList
                  citations={unique}
                  selectedId={selected.id}
                  onSelect={onSelect}
                />
              </div>
            ) : null}
          </div>
        </ScrollArea>
      )}

      <div className="shrink-0 border-t border-border px-4 py-3 text-[10px] leading-relaxed text-ink-muted">
        Vérifiez toujours la page originale du document cité.
      </div>
    </div>
  );
}
