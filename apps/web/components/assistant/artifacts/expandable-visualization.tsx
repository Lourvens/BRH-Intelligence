"use client";

import { Maximize2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ExpandableVisualization({
  title,
  subtitle,
  source,
  expanded,
}: {
  title: string;
  subtitle: string;
  source: string;
  expanded: ReactNode;
}) {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Agrandir : ${title}`}
            className="h-9 w-auto gap-1.5 rounded-sm px-2 text-caption text-ink-muted hover:bg-surface-alt hover:text-navy-ink"
          >
            <Maximize2 className="size-3.5" aria-hidden />
            <span>Agrandir</span>
          </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Agrandir</TooltipContent>
      </Tooltip>

        <DialogContent className="flex h-[min(90dvh,900px)] w-[min(1200px,96vw)] max-w-none flex-col gap-0 overflow-hidden rounded-sm bg-surface p-0 shadow-none sm:max-w-none">
          <DialogHeader className="shrink-0 border-b border-border p-4 pr-12">
            <DialogTitle className="font-display text-small font-bold text-navy-ink">
              {title}
            </DialogTitle>
            <DialogDescription className="text-caption text-ink-muted">
              {subtitle}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto p-3">{expanded}</div>
          <div className="shrink-0 border-t border-border px-4 py-2 text-caption text-ink-muted">
            Source : {source}
          </div>
        </DialogContent>
    </Dialog>
  );
}
