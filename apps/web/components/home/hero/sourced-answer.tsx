import { CheckCircle2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

import { CitationChip } from "@/components/ui/citation-chip";
import { cn } from "@/lib/utils";

import type { QueryPreset } from "./query-presets";

/** Left pane of the agent console: the answer and its citation. */
export function SourcedAnswer({ current }: { current: QueryPreset }) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border p-5 transition-all sm:p-6",
        current.isRefusal
          ? "border-scarlet/30 bg-scarlet/[0.03]"
          : "border-border bg-surface shadow-sm",
      )}
    >
      <div>
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <span className="inline-flex items-center gap-2 text-micro font-bold uppercase tracking-wider text-navy">
            {current.isRefusal ? (
              <>
                <ShieldAlert className="size-4 text-scarlet" />
                <span className="text-scarlet">Refus explicite</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-gold-ink" />
                Réponse avec citation
              </>
            )}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              current.isRefusal
                ? "bg-scarlet/10 text-scarlet"
                : "bg-emerald/10 text-emerald",
            )}
          >
            {current.isRefusal ? (
              <ShieldAlert className="size-3" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            {current.isRefusal ? "Refus explicite" : "Source citée"}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-small leading-relaxed text-ink sm:text-body">
            {current.answerLead}{" "}
            <strong
              className={cn(
                "font-display text-lead font-extrabold",
                current.isRefusal ? "text-scarlet" : "text-navy",
              )}
            >
              {current.answerHighlight}
            </strong>
            {current.answerTail}
            {!current.isRefusal ? (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white shadow-sm">
                1
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-border/80 pt-4">
        {!current.isRefusal && current.pageNumber ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CitationChip
              index={1}
              title={current.documentTitle}
              page={current.pageNumber}
            />
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-azure">
              Page citée
              <CheckCircle2 className="size-3.5 text-emerald" />
            </span>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-micro font-medium text-scarlet">
            <ShieldCheck className="size-4" />
            Refus explicite : aucune réponse sans document.
          </p>
        )}
      </div>
    </div>
  );
}
