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
import { useEffect, useRef, useState } from "react";

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
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">(
    "idle",
  );
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function copyCitation() {
    try {
      const pdf = citation.pdfUrl ? `\n${citation.pdfUrl}` : "";
      await navigator.clipboard.writeText(
        `« ${citation.snippet} » — ${citation.title}, p. ${citation.page}${pdf}`,
      );
      setCopyState("done");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("error");
    }
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
      <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
        Source principale citée
      </div>
      <Card className="w-full min-w-0 max-w-full gap-0 overflow-hidden rounded-xl border-border bg-gradient-to-b from-surface to-bg py-0 shadow-none">
        <CardContent className="min-w-0 p-4">
          <div className="mb-3 flex items-start gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy text-gold">
              <FileText className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <Badge
                variant="outline"
                className="mb-1 rounded border-azure/25 bg-azure/5 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-teal"
              >
                {citation.kind}
              </Badge>
              <h3 className="font-reading text-[13px] font-semibold leading-snug text-navy-ink">
                {citation.title}
              </h3>
              <p className="mt-0.5 text-[10px] text-ink-muted">
                {citation.source} · page {citation.page}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gold/20 border-l-2 border-l-gold bg-gold/10 p-3 font-reading text-[12px] italic leading-6 text-ink">
            « {citation.snippet} »
          </div>

          {citation.pdfUrl ? (
            <div className="mt-3 rounded-lg border border-azure/25 bg-azure/5 p-2.5">
              <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-teal">
                <FileText className="size-3" aria-hidden />
                PDF source
              </div>
              <a
                href={citation.pdfUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Ouvrir le PDF source de ${citation.title}`}
                className="block break-all rounded-sm font-mono text-[10px] leading-snug text-teal underline decoration-azure/40 underline-offset-2 transition-colors duration-150 hover:text-navy-ink active:opacity-70"
              >
                {citation.pdfUrl}
              </a>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyCitation}
              className={cn(
                "flex-1 gap-1.5 rounded-lg border-border bg-surface text-[11px] font-medium text-navy-ink transition-[background-color,border-color,color,transform] duration-150 hover:bg-surface-alt active:scale-[0.98] motion-reduce:transition-none",
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
                  : "Copier la citation"}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-lg bg-surface-alt text-navy-ink transition-[background-color,color,transform] duration-150 hover:bg-border/60 active:scale-95 motion-reduce:transition-none"
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
