"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatCitation } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

export function SourceDetail({ citation }: { citation: ChatCitation }) {
  const feedback = useActionFeedback();
  const copyState = feedback.state === "success" ? "done" : feedback.state;
  const reduceMotion = useReducedMotion();

  function copyCitation() {
    const pdf = citation.pdfUrl ? `\n${citation.pdfUrl}` : "";
    return feedback.run(() => navigator.clipboard.writeText(
      `« ${citation.snippet} » — ${citation.title}, p. ${citation.page}${pdf}`,
    ));
  }

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0.01 : 0.16,
        ease: [0.2, 0, 0, 1],
      }}
    >
      <div className="mb-2 px-1 text-caption font-bold uppercase tracking-wider text-ink-muted">
        Source sélectionnée
      </div>
      <Card className="w-full min-w-0 max-w-full gap-0 overflow-hidden rounded-none border-0 bg-surface py-0 shadow-none">
        <CardContent className="min-w-0 p-0">
          <div className="mb-3 flex items-start gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface-alt text-navy-ink">
              <FileText className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <Badge
                variant="outline"
                className="mb-1 rounded border-azure/25 bg-azure/5 px-1.5 py-0 text-[11px] font-bold uppercase tracking-wider text-teal"
              >
                {citation.kind}
              </Badge>
              <h3 className="font-reading text-base font-semibold leading-snug text-navy-ink">
                {citation.title}
              </h3>
              <p className="mt-0.5 text-caption text-ink-muted">
                {citation.source} · page {citation.page}
              </p>
            </div>
          </div>

          <div className="border-l-2 border-gold bg-surface-alt px-4 py-3 font-reading text-[15px] italic leading-6 text-ink">
            « {citation.snippet} »
          </div>

          {citation.pdfUrl ? (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-teal">
                <FileText className="size-3" aria-hidden />
                PDF source
              </div>
              <a
                href={citation.pdfUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Ouvrir le PDF source de ${citation.title}`}
                className="inline-flex items-center gap-1 text-small font-medium text-teal underline decoration-azure/40 underline-offset-4 transition-colors duration-150 hover:text-navy-ink"
              >
                Ouvrir le document · page {citation.page}
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyCitation}
              disabled={copyState === "pending"}
              aria-busy={copyState === "pending"}
              className={cn(
                "flex-1 gap-1.5 rounded-sm border-border bg-surface text-caption shadow-none font-medium text-navy-ink transition-colors duration-150 hover:bg-surface-alt motion-reduce:transition-none",
                copyState === "done" &&
                  "border-emerald/30 text-emerald hover:text-emerald",
                copyState === "error" &&
                  "border-scarlet/40 text-scarlet hover:border-scarlet/60 hover:text-scarlet",
              )}
            >
              {copyState === "error" ? (
                <CircleAlert className="size-3.5" aria-hidden />
              ) : copyState === "done" ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Copy className="size-3.5 text-teal" aria-hidden />
              )}
              {copyState === "done"
                ? "Citation copiée"
                : copyState === "error"
                  ? "Copie impossible"
                  : copyState === "pending"
                    ? "Copie en cours…"
                    : "Copier la citation"}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-sm bg-surface-alt text-navy-ink transition-colors duration-150 hover:bg-border/60 motion-reduce:transition-none"
                >
                  <Link href="/#corpus" aria-label="Explorer le corpus">
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Explorer le corpus</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <span className="sr-only" role="status" aria-live="polite">
        {copyState === "done"
          ? "Citation copiée."
          : copyState === "error"
            ? "La copie a échoué. Sélectionnez le texte manuellement."
            : ""}
      </span>
    </motion.div>
  );
}
