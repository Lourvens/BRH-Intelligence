import { ShieldCheckIcon } from "@/components/illustrations/icons";
import { corpus } from "@/lib/content/home";

/**
 * A real paragraph from the November 2025 inflation note, with the number that
 * answers the hero question highlighted. This is the literal middle of the
 * product: the page, not a summary of it.
 */
export function OfficialExcerpt() {
  const { excerpt } = corpus;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-sm bg-gold px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-navy">
          {excerpt.label}
        </span>
        <div className="flex items-center gap-2 text-[10px] text-ink-muted">
          <span>{excerpt.document}</span>
          <span className="rounded-sm bg-navy px-2 py-0.5 font-medium text-white">
            Page {excerpt.page}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Note mensuelle
        </p>
        <h3 className="mt-1 font-display text-small font-semibold text-navy">
          {excerpt.title}
        </h3>
        <p className="mt-3 text-small leading-relaxed text-ink-muted">
          {excerpt.body.split(excerpt.highlight).map((part, index, parts) => (
            <span key={part + index}>
              {part}
              {index < parts.length - 1 ? (
                <mark className="rounded-sm bg-gold/70 px-1 font-medium text-navy">
                  {excerpt.highlight}
                </mark>
              ) : null}
            </span>
          ))}
        </p>

        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[10px] text-ink-muted">
          <ShieldCheckIcon className="size-3.5 shrink-0 text-emerald" />
          {excerpt.status} · {excerpt.source}
        </div>
      </div>
    </div>
  );
}
