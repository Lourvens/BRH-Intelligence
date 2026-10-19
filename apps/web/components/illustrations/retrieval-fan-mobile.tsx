import { cn } from "@/lib/utils";

const documents = [
  { label: "Note d'inflation", page: "p. 3", selected: true },
  { label: "Politique monétaire", page: "p. 6" },
  { label: "Inclusion financière", page: "p. 10" },
  { label: "Bulletin statistique", page: "p. 21" },
];

/**
 * The mobile version of the retrieval fan. The desktop SVG is too dense to
 * read at 390px; this keeps the same question → passages → page story in a
 * vertical, legible stack.
 */
export function RetrievalFanMobile() {
  return (
    <div>
      <div className="rounded-xl border border-white/15 bg-white/5 p-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50">
          Question
        </p>
        <p className="mt-1 font-display text-small font-semibold leading-snug text-white">
          Inflation annuelle
          <br />
          novembre 2025
        </p>
        <p className="mt-2 text-[10px] font-medium text-azure">
          3 passages retenus
        </p>
      </div>

      <div className="relative mt-4 space-y-2 pl-5">
        <span
          aria-hidden
          className="absolute bottom-4 left-2 top-0 w-px bg-white/20"
        />

        {documents.map((document) => (
          <div
            key={document.label}
            className={cn(
              "relative rounded-lg border p-3 pr-7",
              document.selected
                ? "border-azure bg-surface"
                : "border-white/15 bg-surface/90",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute -left-[17px] top-1/2 size-2 -translate-y-1/2 rounded-full",
                document.selected ? "bg-azure" : "bg-white/30",
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "text-[11px] font-medium",
                  document.selected ? "text-navy" : "text-ink-muted",
                )}
              >
                {document.label}
              </span>
              <span className="text-[10px] text-ink-muted">
                {document.page}
              </span>
            </div>
            {document.selected ? (
              <span
                aria-hidden
                className="absolute right-2 top-1/2 h-3 w-1.5 -translate-y-1/2 rounded-sm bg-gold"
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
