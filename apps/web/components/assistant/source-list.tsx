"use client";

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
    <div className="w-full min-w-0 space-y-1.5">
      {citations.map((citation, index) => (
        <div
          key={citation.id}
          className={cn(
            "w-full min-w-0 rounded-lg border px-2.5 py-2 transition-colors",
            citation.id === selectedId
              ? "border-azure/40 bg-azure/5"
              : "border-transparent hover:bg-surface-alt",
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(citation.id)}
            className="flex w-full items-start gap-2 text-left"
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
          </button>
          {citation.pdfUrl ? (
            <a
              href={citation.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block w-full min-w-0 break-all pl-7 font-mono text-[9px] leading-snug text-teal underline decoration-azure/40 underline-offset-2 hover:text-navy-ink"
            >
              {citation.pdfUrl}
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}
