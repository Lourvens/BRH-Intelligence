"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Copy, FileText, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAnswerActions } from "@/lib/hooks/use-answer-actions";
import type { ChatCitation } from "@/lib/chat/types";
import { disclosureVariants, feedbackTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { FeedbackAction } from "./feedback-action";
import { SourceList } from "./source-list";

export function MessageActions({ content, citations = [], selectedCitationId, onSelectCitation }: {
  content: string;
  citations?: readonly ChatCitation[];
  selectedCitationId: string | null;
  onSelectCitation: (citationId: string) => void;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sourceTrigger = useRef<HTMLButtonElement>(null);
  const sourceContent = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { copyState, shareState, copy, share } = useAnswerActions(content, citations);

  function setSourcesExpanded(open: boolean) {
    if (!open && sourceContent.current?.contains(document.activeElement)) sourceTrigger.current?.focus();
    setSourcesOpen(open);
  }

  const announcement = copyState === "error" ? "La copie a échoué. Réessayez ou sélectionnez le texte manuellement." : shareState === "error" ? "Le partage a échoué. Réessayez ou copiez le texte manuellement." : copyState === "success" ? "Réponse et sources copiées." : shareState === "fallback" ? "Réponse et sources copiées. Vous pouvez les coller dans l’application de votre choix." : shareState === "success" ? "Réponse partagée." : "";

  return (
    <Collapsible open={sourcesOpen} onOpenChange={setSourcesExpanded} className="mt-4 border-t border-border pt-2">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Actions de la réponse">
        {citations.length ? (
          <CollapsibleTrigger asChild>
            <Button ref={sourceTrigger} type="button" variant="ghost" size="sm" className={cn("h-10 gap-1.5 rounded-sm px-2 text-caption text-ink-muted transition-colors hover:bg-surface-alt hover:text-navy-ink", sourcesOpen && "bg-surface-alt text-navy-ink")}>
              <FileText className="size-3.5 text-gold-ink" aria-hidden />
              Sources ({citations.length})
              <motion.span aria-hidden animate={{ rotate: sourcesOpen ? 180 : 0 }} transition={reduceMotion ? { duration: 0 } : feedbackTransition} className="inline-flex"><ChevronDown className="size-3" /></motion.span>
            </Button>
          </CollapsibleTrigger>
        ) : null}
        <FeedbackAction state={copyState} label="Copier" successLabel="Copié" icon={Copy} onClick={copy} />
        <FeedbackAction state={shareState} label="Partager" successLabel="Partagé" icon={Share2} onClick={share} />
        <span className="ml-auto hidden text-[11px] text-ink-muted sm:inline">Réponse de démonstration</span>
      </div>
      <p role="status" aria-live="polite" className={cn("text-caption leading-5", copyState === "error" || shareState === "error" ? "mt-2 text-scarlet" : "sr-only")}>{announcement}</p>
      {citations.length ? (
        <CollapsibleContent forceMount asChild>
          <motion.div ref={sourceContent} inert={!sourcesOpen} aria-hidden={!sourcesOpen} initial={false} variants={disclosureVariants} animate={sourcesOpen ? "open" : "closed"} transition={reduceMotion ? { duration: 0 } : feedbackTransition} className="grid">
            <div className="min-h-0 overflow-hidden">
              <div className="max-h-72 overflow-y-auto overscroll-contain pt-3">
                <SourceList citations={citations} selectedId={selectedCitationId} onSelect={onSelectCitation} />
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}
