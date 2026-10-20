"use client";

import { Check } from "lucide-react";

import type { ChatCitation } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

export function SourceList({
  citations,
  selectedId,
  onSelect,
}: {
  citations: readonly ChatCitation[];
  selectedId: string;
  onSelect: (citationId: string) => void;
}) {
  return (
    <div className="w-full min-w-0 max-w-full space-y-1.5 overflow-hidden">
      {citations.map((citation, index) => (
        <div
          key={citation.id}
          className={cn(
            "relative w-full min-w-0 max-w-full overflow-hidden rounded-lg border px-2.5 py-2 transition-[background-color,border-color,transform] duration-150 focus-within:ring-2 focus-within:ring-azure/40 focus-within:ring-offset-2 focus-within:ring-offset-surface active:scale-[0.995] motion-reduce:transition-none",
            citation.id === selectedId
              ? "border-azure/40 bg-azure/5"
              : "border-transparent hover:bg-surface-alt",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold transition-opacity duration-150",
              citation.id === selectedId ? "opacity-100" : "opacity-0",
            )}
          />
          <button
            type="button"
            onClick={() => onSelect(citation.id)}
            aria-current={citation.id === selectedId ? "true" : undefined}
            className="flex w-full min-w-0 max-w-full items-start gap-2 rounded-sm text-left focus-visible:outline-none"
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-navy text-[10px] font-bold text-white">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-medium text-navy-ink">
                {citation.title}
              </span>
              <span className="text-[10px] text-ink-muted">
                p. {citation.page}
              </span>
            </span>
            <Check
              aria-hidden
              className={cn(
                "mt-0.5 size-3.5 shrink-0 text-gold-ink transition-[opacity,transform] duration-150",
                citation.id === selectedId
                  ? "scale-100 opacity-100"
                  : "scale-75 opacity-0",
              )}
            />
          </button>
          {citation.pdfUrl ? (
            <a
              href={citation.pdfUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Ouvrir le PDF source de ${citation.title}`}
              className="mt-1 block min-w-0 max-w-full break-all rounded-sm pl-7 font-mono text-[9px] leading-snug text-teal underline decoration-azure/40 underline-offset-2 transition-colors duration-150 [overflow-wrap:anywhere] hover:text-navy-ink focus-visible:outline-none active:opacity-70"
            >
              {citation.pdfUrl}
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}
