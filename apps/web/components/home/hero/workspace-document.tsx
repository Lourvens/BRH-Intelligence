"use client";

import { Check, Copy, FileText } from "lucide-react";
import { useState } from "react";

import { demo } from "./data";

export function WorkspaceDocument() {
  const [copied, setCopied] = useState(false);
  const [quoteBefore, quoteAfter] = demo.quote.split(demo.quoteHighlight);

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(
        `« ${demo.quote} » — ${demo.source}, p. ${demo.page}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm lg:col-span-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-blue" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-ink">
              Document source
            </span>
          </div>
          <span className="rounded border border-border bg-surface-alt px-2 py-0.5 font-mono text-[10.5px] text-ink-muted">
            {demo.documentCode}
          </span>
        </div>

        <div className="mt-3.5 rounded-xl border border-border bg-bg p-3.5 text-[11.5px] leading-relaxed text-ink">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-[10px]">
            <span className="rounded bg-navy px-1.5 py-0.5 font-bold text-white">
              Page {demo.page} / {demo.totalPages}
            </span>
            <span className="rounded border border-gold/50 bg-gold/20 px-1.5 py-0.5 font-mono font-bold text-navy-ink">
              Extrait sourcé
            </span>
          </div>
          <p className="mb-1.5 font-mono text-[10.5px] text-ink-muted">
            // EXTRAIT OFFICIEL · BRH
          </p>
          <p className="text-[11px] text-ink-muted">
            {demo.source} · {demo.answerDetail}
          </p>
          <div className="my-2 rounded border-l-4 border-gold bg-gold/15 p-2 text-[12px] font-medium text-ink">
            « {quoteBefore}
            <span className="rounded bg-gold px-1 py-0.5 font-bold text-navy-deep">
              {demo.quoteHighlight}
            </span>
            {quoteAfter} »
          </div>
          <p className="text-[10.5px] text-ink-muted">
            Source : IHSI / BRH · {demo.source}, p. {demo.page}.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={demo.documentHref}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-caption font-semibold text-navy-ink shadow-sm transition-colors hover:border-navy-ink"
        >
          <FileText className="size-4 text-scarlet" aria-hidden />
          Ouvrir le document source
        </a>
        <button
          type="button"
          onClick={copyCitation}
          title={copied ? "Citation copiée" : "Copier la citation"}
          aria-label={copied ? "Citation copiée" : "Copier la citation"}
          className="rounded-lg bg-surface-alt p-2 text-ink-muted transition-colors hover:bg-border/60 hover:text-navy-ink"
        >
          {copied ? (
            <Check className="size-4 text-emerald" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
