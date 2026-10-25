"use client";

import { motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

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
            className="group/rail-open text-ink-muted transition-colors duration-150 hover:bg-surface-alt hover:text-navy-ink motion-reduce:transition-none"
          >
            <PanelRightOpen
              className="size-4 transition-transform duration-150 motion-reduce:transition-none"
              aria-hidden
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Déplier les sources</TooltipContent>
      </Tooltip>

      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ouvrir les sources documentaires (${count})`}
        className="group/rail flex min-h-0 flex-1 flex-col items-center gap-2 rounded-sm px-1 py-2 text-ink-muted transition-colors duration-150 hover:bg-surface-alt hover:text-navy-ink motion-reduce:transition-none"
      >
        <BookOpen
          className="size-4 transition-transform duration-150 motion-reduce:transition-none"
          aria-hidden
        />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-bold uppercase tracking-wider">
          Sources
        </span>
        <Badge
          variant="secondary"
          className="mt-auto h-5 min-w-5 rounded-sm border-azure/20 bg-azure/5 px-1 text-[11px] text-teal"
        >
          <motion.span
            key={count}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
          >
            {count}
          </motion.span>
        </Badge>
      </button>
    </div>
  );
}
