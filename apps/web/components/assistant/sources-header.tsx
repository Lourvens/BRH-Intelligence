"use client";

import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { citationCountLabel } from "@/lib/chat/citations";

export function SourcesHeader({
  count,
  onClose,
}: {
  count: number;
  onClose?: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
      <div>
        <h2 className="font-display text-caption font-bold text-navy-ink">
          Sources
        </h2>
        <p
          role="status"
          aria-live="polite"
          className="text-caption text-ink-muted"
        >
          <motion.span
            key={count}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
            className="inline-block"
          >
            {citationCountLabel(count)}
          </motion.span>
        </p>
      </div>
      {onClose ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Fermer les sources"
              className="text-ink-muted transition-colors duration-150 hover:bg-surface-alt hover:text-navy-ink motion-reduce:transition-none"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Fermer les sources</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
