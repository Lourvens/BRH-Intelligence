"use client";

import { Maximize2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(true)}
            aria-label={`Agrandir : ${title}`}
            className="text-ink-muted hover:bg-surface-alt hover:text-navy-ink"
          >
            <Maximize2 className="size-3.5" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Agrandir</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(90dvh,900px)] w-[min(1200px,96vw)] max-w-none flex-col gap-0 overflow-hidden bg-surface p-0 sm:max-w-none">
          <DialogHeader className="shrink-0 border-b border-border p-4 pr-12">
            <DialogTitle className="font-display text-caption font-bold text-navy-ink">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[10px] text-ink-muted">
              {subtitle}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto p-3">{expanded}</div>
          <div className="shrink-0 border-t border-border px-4 py-2 text-[10px] text-ink-muted">
            Source : {source}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
