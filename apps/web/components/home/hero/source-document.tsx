import { ArrowRight, FileText } from "lucide-react";

import { PageSourceIcon } from "@/components/illustrations/icons";

import type { QueryPreset } from "./query-presets";

/** Right pane of the agent console: the source page, with the cited line marked. */
export function SourceDocument({ current }: { current: QueryPreset }) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-navy/20 bg-surface-alt/60 p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-navy text-[10px] font-bold text-white">
            BRH
          </span>
          <div>
            <p className="font-display text-micro font-bold uppercase tracking-tight text-navy">
              Banque de la République d&apos;Haïti
            </p>
            <p className="max-w-[200px] truncate text-[10px] text-ink-muted">
              {current.documentTitle}
            </p>
          </div>
        </div>

        {current.pageNumber ? (
          <span className="rounded-md border border-navy/20 bg-navy/5 px-2 py-0.5 font-mono text-[11px] font-bold text-navy">
            Page {current.pageNumber} / {current.totalPages}
          </span>
        ) : null}
      </div>

      <div className="relative my-4 rounded-xl border border-border/80 bg-surface p-4 shadow-inner">
        <div className="flex items-center justify-between pb-2 text-[10px] font-semibold text-ink-muted">
          <span className="flex items-center gap-1">
            <FileText className="size-3 text-azure" />
            Passage du document
          </span>
          <span>{current.documentDate}</span>
        </div>

        <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-ink/90">
          «&nbsp;...
          {current.documentExcerpt
            .split(current.answerHighlight)
            .map((part, index, parts) => (
              <span key={part + index}>
                {part}
                {index < parts.length - 1 ? (
                  <mark className="rounded bg-gold/50 px-1 py-0.5 font-semibold text-navy">
                    {current.answerHighlight}
                  </mark>
                ) : null}
              </span>
            ))}
          ...&nbsp;»
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-ink-muted">
          <span className="flex items-center gap-1 font-semibold text-navy">
            <PageSourceIcon className="size-3 text-emerald" />
            Extrait du corpus
          </span>
          <span className="font-medium text-azure">brh.ht</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-micro text-ink-muted">
        <span>Extrait du document source</span>
        <a
          href="#corpus"
          className="inline-flex items-center gap-1 font-semibold text-navy hover:text-azure hover:underline"
        >
          Examiner dans le corpus
          <ArrowRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
