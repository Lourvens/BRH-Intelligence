"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();
  const unique = uniqueCitations(citations);

  return (
    <div className="flex h-full w-full min-w-0 shrink-0 flex-col overflow-hidden bg-surface">
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
              key={unique.length}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
              className="inline-block"
            >
              {unique.length
                ? `${unique.length} référence${unique.length > 1 ? "s" : ""} active${unique.length > 1 ? "s" : ""}`
                : "Aucune référence"}
            </motion.span>
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
                  className="text-ink-muted transition-colors duration-150 hover:bg-surface-alt hover:text-navy-ink motion-reduce:transition-none"
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
              className="text-ink-muted transition-colors duration-150 hover:bg-surface-alt hover:text-navy-ink motion-reduce:transition-none xl:hidden"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!selected ? (
          <motion.div
            key="sources-empty"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0.01 } }
                : { opacity: 0, y: -3, transition: { duration: 0.1 } }
            }
            transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
            className="flex w-full flex-1 flex-col items-center justify-center px-6 text-center"
          >
            <div className="mb-3 grid size-12 place-items-center rounded-sm bg-surface-alt text-teal">
              <FileSearch className="size-6" aria-hidden />
            </div>
            <p className="font-display text-small font-bold text-navy-ink">
              Les sources apparaîtront ici
            </p>
            <p className="mt-1.5 max-w-[220px] text-small leading-relaxed text-ink-muted">
              Chaque réponse renvoie à un document et à une page du corpus.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="sources-content"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0.01 } }
                : { opacity: 0, y: -3, transition: { duration: 0.1 } }
            }
            transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
            className="min-h-0 w-full flex-1 overflow-hidden"
          >
            <ScrollArea
              type="always"
              className="h-full w-full overscroll-contain [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden"
            >
              <div className="w-full min-w-0 max-w-full overflow-hidden p-4">
                <SourceDetail key={selected.id} citation={selected} />

                {unique.length > 1 ? (
                  <div className="mt-5 w-full min-w-0">
                    <div className="mb-2 px-1 text-caption font-bold uppercase tracking-wider text-ink-muted">
                      Références de la conversation
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
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shrink-0 border-t border-border px-4 py-3 text-caption leading-relaxed text-ink-muted">
        Vérifiez toujours la page originale du document cité.
      </div>
    </div>
  );
}
