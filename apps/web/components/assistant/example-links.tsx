import type { SuggestedQuestion } from "@/lib/chat/types";

export function ExampleLinks({
  suggestions,
  onSelect,
}: {
  suggestions: readonly SuggestedQuestion[];
  onSelect: (threadId: string) => void;
}) {
  return (
    <nav
      aria-label="Exemples de questions"
      className="mx-auto w-full max-w-[760px] px-4 pb-8 pt-4 text-center sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="text-[11px] text-ink-muted">Exemples</span>
        {suggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.threadId)}
            aria-label={`${item.category} : ${item.question}`}
            title={item.question}
            className="min-h-9 rounded-md px-1 text-xs text-ink-muted underline decoration-border underline-offset-4 transition-colors hover:text-navy-ink hover:decoration-azure focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure"
          >
            {item.category}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink-muted">
        Démonstration locale · les réponses sont préenregistrées.
      </p>
    </nav>
  );
}
