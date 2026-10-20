"use client";

import {
  ArrowUpRight,
  Check,
  Copy,
  FileSearch,
  FileText,
  PanelRightClose,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { uniqueCitations } from "@/lib/chat/citations";
import type { ChatCitation } from "@/lib/chat/types";

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
  const [copied, setCopied] = useState(false);
  const unique = uniqueCitations(citations);

  async function copyCitation() {
    if (!selected) return;
    try {
      const pdf = selected.pdfUrl ? `\n${selected.pdfUrl}` : "";
      await navigator.clipboard.writeText(
        `« ${selected.snippet} » — ${selected.title}, p. ${selected.page}${pdf}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex h-full w-full min-w-0 shrink-0 flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div>
          <h2 className="font-display text-caption font-bold text-navy">
            Sources documentaires
          </h2>
          <p className="text-[10px] text-ink-muted">
            {unique.length
              ? `${unique.length} référence${unique.length > 1 ? "s" : ""} active${unique.length > 1 ? "s" : ""}`
              : "Aucune référence"}
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
                  className="text-ink-muted hover:bg-surface-alt"
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
              className="text-ink-muted hover:bg-surface-alt xl:hidden"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {!selected ? (
        <div className="flex w-full flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-surface-alt text-teal">
            <FileSearch className="size-6" aria-hidden />
          </div>
          <p className="font-display text-small font-bold text-navy">
            Les sources apparaîtront ici
          </p>
          <p className="mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-ink-muted">
            Chaque réponse renvoie à un document et à une page du corpus.
          </p>
        </div>
      ) : (
        <ScrollArea type="always" className="min-h-0 w-full flex-1">
          <div className="w-full min-w-0 p-4">
          <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-gold-ink">
            Source principale citée
          </div>
          <Card className="gap-0 rounded-xl border-border bg-bg py-0 shadow-none">
            <CardContent className="p-4">
              <div className="mb-3 flex items-start gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy text-gold">
                  <FileText className="size-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <Badge
                    variant="outline"
                    className="mb-1 rounded border-azure/25 bg-azure/5 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-teal"
                  >
                    {selected.kind}
                  </Badge>
                  <h3 className="font-reading text-[13px] font-semibold leading-snug text-navy">
                    {selected.title}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    {selected.source} · page {selected.page}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border border-l-2 border-l-azure bg-surface p-3 font-reading text-[12px] italic leading-6 text-ink">
                « {selected.snippet} »
              </div>

              {selected.pdfUrl ? (
                <div className="mt-3 rounded-lg border border-azure/25 bg-azure/5 p-2.5">
                  <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-teal">
                    <FileText className="size-3" aria-hidden />
                    PDF source
                  </div>
                  <a
                    href={selected.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all font-mono text-[10px] leading-snug text-teal underline decoration-azure/40 underline-offset-2 hover:text-navy"
                  >
                    {selected.pdfUrl}
                  </a>
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyCitation}
                  className="flex-1 gap-1.5 rounded-lg border-border bg-surface text-[11px] font-medium text-navy hover:bg-surface-alt"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald" aria-hidden />
                  ) : (
                    <Copy className="size-3.5 text-teal" aria-hidden />
                  )}
                  {copied ? "Citation copiée" : "Copier la citation"}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      variant="secondary"
                      size="icon-sm"
                      className="rounded-lg bg-surface-alt text-navy hover:bg-border/60"
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

          {unique.length > 1 ? (
            <div className="mt-5 w-full min-w-0">
              <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Toutes les sources
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
      )}

      <div className="shrink-0 border-t border-border px-4 py-3 text-[10px] leading-relaxed text-ink-muted">
        Vérifiez toujours la page originale du document cité.
      </div>
    </div>
  );
}
