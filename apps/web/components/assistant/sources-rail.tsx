"use client";

import { BookOpen, PanelRightOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SourcesRail({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  return (
    <div className="flex h-full w-12 flex-col items-center gap-2 bg-surface py-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onOpen}
            aria-label="Déplier les sources"
            className="text-ink-muted hover:bg-surface-alt hover:text-navy-ink"
          >
            <PanelRightOpen className="size-4" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Déplier les sources</TooltipContent>
      </Tooltip>

      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ouvrir les sources documentaires (${count})`}
        className="flex min-h-0 flex-1 flex-col items-center gap-2 rounded-lg px-1 py-2 text-ink-muted transition-colors hover:bg-surface-alt hover:text-navy-ink"
      >
        <BookOpen className="size-4" aria-hidden />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] font-bold uppercase tracking-wider">
          Sources
        </span>
        <Badge
          variant="secondary"
          className="mt-auto h-5 min-w-5 rounded-full border-azure/20 bg-azure/5 px-1 text-[9px] text-teal"
        >
          {count}
        </Badge>
      </button>
    </div>
  );
}
