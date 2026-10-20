import { ArrowUpRight, BadgeCheck, FileText, Landmark } from "lucide-react";

import { demo } from "./data";

export function WorkspaceAnswer() {
  const [quoteBefore, quoteAfter] = demo.quote.split(demo.quoteHighlight);

  return (
    <div className="flex flex-col justify-between gap-5 rounded-2xl border border-border bg-gradient-to-b from-surface to-bg p-5 shadow-sm sm:p-6 lg:col-span-7">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-navy px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Réponse sourcée
            </span>
            <span className="rounded-full border border-gold/60 bg-gold/30 px-2 py-0.5 text-[10px] font-bold text-navy-ink dark:bg-gold/20">
              Source citée
            </span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold text-emerald">
            <BadgeCheck className="size-3.5" aria-hidden />
            Page citée : {demo.page}
          </span>
        </div>

        <div className="relative mt-4 overflow-hidden rounded-xl bg-gradient-to-br from-navy via-navy-deep to-teal p-4 text-white shadow-md dark:to-teal/40">
          <Landmark
            className="pointer-events-none absolute -bottom-4 -right-4 size-24 text-white/10"
            aria-hidden
          />
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/60">
            <span>{demo.answerLabel}</span>
            <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[10px] text-gold">
              {demo.answerBadge}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              {demo.answerValue}
            </span>
            <span className="text-caption font-medium text-white/70">
              {demo.answerDetail}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-surface p-3.5 text-caption leading-relaxed text-ink">
          <p className="italic">
            « {quoteBefore}
            <strong className="rounded bg-gold/40 px-1 py-0.5 font-semibold text-navy-ink dark:bg-gold/25">
              {demo.quoteHighlight}
            </strong>
            {quoteAfter} »
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-[11px]">
            <span className="flex items-center gap-1 font-mono font-semibold text-teal">
              <FileText className="size-3.5" aria-hidden />
              Source : {demo.sourceMeta}
            </span>
            <span className="text-ink-muted">
              Passage retrouvé dans le document
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5 text-[11.5px] text-ink-muted">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-navy-ink">
          <FileText className="size-4 text-teal" aria-hidden />
          {demo.documentCode}
        </span>
        <a
          href="#corpus"
          className="inline-flex items-center gap-1 font-semibold text-teal hover:underline"
        >
          Voir la source
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}
