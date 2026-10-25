"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CircleAlert, ClipboardCheck, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionFeedbackState } from "@/lib/hooks/use-action-feedback";
import { feedbackTransition, feedbackVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function FeedbackAction({ state, label, successLabel, icon: Icon, onClick }: {
  state: ActionFeedbackState;
  label: string;
  successLabel: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const FeedbackIcon = state === "pending" ? Loader2 : state === "error" ? CircleAlert : state === "fallback" ? ClipboardCheck : state === "success" ? Check : Icon;
  const feedback = state === "pending" ? "En cours…" : state === "error" ? "Réessayer" : state === "fallback" ? "Texte copié" : state === "success" ? successLabel : label;

  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} disabled={state === "pending"} aria-busy={state === "pending"} aria-label={state === "pending" ? `${label} : en cours` : state === "error" ? `${label} : réessayer` : label} className={cn("h-10 min-w-24 rounded-sm px-2 text-caption text-ink-muted transition-colors hover:bg-surface-alt hover:text-navy-ink", state === "success" && "text-emerald hover:text-emerald", state === "fallback" && "text-teal hover:text-teal", state === "error" && "text-scarlet hover:text-scarlet")}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={state} variants={feedbackVariants} initial="hidden" animate="visible" exit="hidden" transition={reduceMotion ? { duration: 0 } : feedbackTransition} className="inline-flex items-center gap-1.5">
          <FeedbackIcon className={cn("size-3.5", state === "pending" && "motion-safe:animate-spin")} aria-hidden />
          {feedback}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
