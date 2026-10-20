import { ArrowUpRight, Check, Landmark } from "lucide-react";

import type { SuggestedQuestion } from "@/lib/chat/types";

export function EmptyState({
  suggestions,
  onSelect,
}: {
  suggestions: readonly SuggestedQuestion[];
  onSelect: (threadId: string) => void;
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 pb-10 pt-16 sm:px-6 xl:pt-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-teal shadow-sm">
            <Landmark className="size-3.5" aria-hidden />
            Assistant documentaire
          </span>
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl">
            Que cherchez-vous dans les archives ?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-small leading-relaxed text-ink-muted sm:text-body">
            Posez une question en français sur les publications de la BRH.
            Chaque réponse renvoie au document et à la page qui la soutiennent.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.threadId)}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:border-teal hover:shadow-md"
            >
              <span className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                  {item.category}
                </span>
                <ArrowUpRight className="size-4 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy" aria-hidden />
              </span>
              <span className="text-small font-semibold leading-snug text-ink">
                {item.question}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald" aria-hidden />
            Corpus francophone
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald" aria-hidden />
            Citations page par page
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald" aria-hidden />
            Refus explicite
          </span>
        </div>

        <p className="mt-5 text-center text-[10px] text-ink-muted/80">
          Démonstration locale · les réponses sont préenregistrées.
        </p>
      </div>
    </div>
  );
}
