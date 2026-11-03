"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { ScrollArea } from "@/components/ui/scroll-area";
import { uniqueCitations } from "@/lib/chat/citations";
import type { ChatCitation } from "@/lib/chat/types";

import { SourceDetail } from "./source-detail";
import { SourceList } from "./source-list";
import { SourcesEmpty } from "./sources-empty";
import { SourcesHeader } from "./sources-header";

export function SourcesPanel({
  citations,
  selected,
  onSelect,
  onClose,
}: {
  citations: readonly ChatCitation[];
  selected: ChatCitation | null;
  onSelect: (citationId: string) => void;
  onClose?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const unique = uniqueCitations(citations);

  return (
    <div className="flex h-full w-full min-w-0 shrink-0 flex-col overflow-hidden bg-surface">
      <SourcesHeader count={unique.length} onClose={onClose} />

      <AnimatePresence mode="wait" initial={false}>
        {!selected ? (
          <SourcesEmpty key="sources-empty" />
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
