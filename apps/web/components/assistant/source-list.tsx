"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { feedbackTransition, feedbackVariants } from "@/lib/motion";
import type { ChatCitation } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

export function SourceList({ citations, selectedId, onSelect }: {
  citations: readonly ChatCitation[];
  selectedId: string | null;
  onSelect: (citationId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="min-w-0 divide-y divide-border border-y border-border">
      {citations.map((citation, index) => (
        <div key={citation.id} className={cn("border-l-2 px-3 py-3 transition-colors", citation.id === selectedId ? "border-l-gold bg-surface-alt" : "border-l-transparent hover:bg-surface-alt")}>
          <button type="button" onClick={() => onSelect(citation.id)} aria-pressed={citation.id === selectedId} className="flex w-full min-w-0 items-start gap-2 text-left">
            <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-gold text-caption font-bold text-navy-deep">{index + 1}</span>
            <span className="min-w-0 flex-1"><span className="block text-small font-medium leading-5 text-navy-ink">{citation.title}</span><span className="mt-1 block text-caption text-ink-muted">{citation.source} · p. {citation.page}</span></span>
            <span className="mt-1 inline-flex size-4 shrink-0" aria-hidden>
              <AnimatePresence initial={false}>
                {citation.id === selectedId ? <motion.span key="selected" variants={feedbackVariants} initial="hidden" animate="visible" exit="hidden" transition={reduceMotion ? { duration: 0 } : feedbackTransition}><Check className="size-4 text-navy-ink" /></motion.span> : null}
              </AnimatePresence>
            </span>
          </button>
          {citation.pdfUrl ? <a href={citation.pdfUrl} target="_blank" rel="noreferrer" aria-label={`Ouvrir le PDF source de ${citation.title}`} className="ml-8 mt-2 inline-flex items-center gap-1 text-caption text-teal underline underline-offset-4">Voir la page citée <ArrowUpRight className="size-3" aria-hidden /></a> : null}
        </div>
      ))}
    </div>
  );
}
