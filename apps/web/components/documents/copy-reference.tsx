"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { feedbackTransition, feedbackVariants } from "@/lib/motion";

export function CopyReference({ title, page, pdfUrl }: { title: string; page: number; pdfUrl: string | null }) {
  const { state, run } = useActionFeedback();
  const copied = state === "success";
  return <div>
    <Button variant="outline" size="sm" className="rounded-sm" aria-busy={state === "pending"}
      onClick={() => run(() => navigator.clipboard.writeText(`${title}, p. ${page}\n${window.location.href}${pdfUrl ? `\n${pdfUrl}` : ""}`))}>
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <AnimatePresence mode="wait" initial={false}><motion.span key={state} variants={feedbackVariants} initial="hidden" animate="visible" exit="hidden" transition={feedbackTransition}>{copied ? "Référence copiée" : "Copier la référence"}</motion.span></AnimatePresence>
    </Button>
    <p role="status" className={state === "error" ? "mt-2 text-caption text-scarlet" : "sr-only"}>{state === "error" ? "Copie impossible. Sélectionnez le texte ou réessayez." : copied ? "Référence et liens copiés." : ""}</p>
  </div>;
}
