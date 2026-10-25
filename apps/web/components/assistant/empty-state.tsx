import { ArrowUpRight, Landmark } from "lucide-react";
import type { SuggestedQuestion } from "@/lib/chat/types";

export function EmptyState({ suggestions, onSelect }: {
  suggestions: readonly SuggestedQuestion[];
  onSelect: (threadId: string) => void;
}) {
  return (
    <div className="flex min-h-full items-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-[880px]">
        <div className="max-w-xl">
          <span className="mb-5 inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-ink-muted"><Landmark className="size-4 text-navy-ink" aria-hidden /> Publications de la BRH</span>
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-navy-ink sm:text-3xl">Une question.<br />Les documents pour y répondre.</h2>
          <p className="mt-4 text-small leading-7 text-ink-muted sm:text-base">Explorez les publications en français. Retrouvez les explications, les données et les pages citées dans un même espace.</p>
        </div>
        <div className="mt-8 border-t border-border">
          <p className="py-4 text-caption font-semibold uppercase tracking-wider text-ink-muted">Pour commencer</p>
          <div className="grid sm:grid-cols-2">
            {suggestions.map((item) => (
              <button key={item.id} type="button" onClick={() => onSelect(item.threadId)} className="group flex min-h-28 items-start justify-between gap-4 border-b border-border py-5 text-left transition-colors hover:bg-surface-alt focus-visible:relative sm:odd:pr-5 sm:even:border-l sm:even:pl-5">
                <span className="min-w-0"><span className="mb-2 block text-caption font-medium text-teal">{item.category}</span><span className="block text-small font-medium leading-6 text-ink">{item.question}</span></span>
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-ink-muted group-hover:text-navy-ink" aria-hidden />
              </button>
            ))}
          </div>
        </div>
        <p className="mt-5 text-caption text-ink-muted">Démonstration locale · les réponses sont préenregistrées.</p>
      </div>
    </div>
  );
}
