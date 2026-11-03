"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ChatCitation } from "@/lib/chat/types";

import { SourcesPanel } from "./sources-panel";

export function SourcesSheet({
  open,
  onOpenChange,
  citations,
  selected,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citations: readonly ChatCitation[];
  selected: ChatCitation | null;
  onSelect: (citationId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(380px,94vw)] gap-0 rounded-none bg-surface p-0 shadow-none sm:max-w-[400px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Sources documentaires</SheetTitle>
          <SheetDescription>
            Les documents et pages qui soutiennent la réponse.
          </SheetDescription>
        </SheetHeader>
        <SourcesPanel
          citations={citations}
          selected={selected}
          onSelect={onSelect}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
