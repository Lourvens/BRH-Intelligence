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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatCitation } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

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

  async function copyCitation() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(
        `« ${selected.snippet} » — ${selected.title}, p. ${selected.page}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div>
          <h2 className="font-display text-caption font-bold text-navy">
            Sources documentaires
          </h2>
          <p className="text-[10px] text-ink-muted">
            {citations.length
              ? `${citations.length} référence${citations.length > 1 ? "s" : ""} active${citations.length > 1 ? "s" : ""}`
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
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
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
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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

          {citations.length > 1 ? (
            <div className="mt-5">
              <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Toutes les sources
              </div>
              <div className="space-y-1.5">
                {citations.map((citation, index) => (
                  <button
                    key={citation.id}
                    type="button"
                    onClick={() => onSelect(citation.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      citation.id === selected.id
                        ? "border-azure/40 bg-azure/5"
                        : "border-transparent hover:bg-surface-alt",
                    )}
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-navy text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium text-navy">
                        {citation.title}
                      </span>
                      <span className="text-[10px] text-ink-muted">
                        p. {citation.page}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="shrink-0 border-t border-border px-4 py-3 text-[10px] leading-relaxed text-ink-muted">
        Vérifiez toujours la page originale du document cité.
      </div>
    </div>
  );
}
