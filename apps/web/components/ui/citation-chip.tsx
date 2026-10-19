import { cn } from "@/lib/utils";

/**
 * A source reference. It mirrors what the agent returns today — an index, a
 * document title and a 1-based page — so the real chat can reuse this exact
 * shape later.
 */
export function CitationChip({
  index,
  title,
  page,
  className,
}: {
  index: number;
  title: string;
  page: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-bg py-1 pl-1 pr-2.5 text-micro font-medium text-ink",
        className,
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-navy text-micro font-semibold leading-none text-white">
        {index}
      </span>
      <span className="truncate">{title}</span>
      <span className="shrink-0 text-ink-muted">p.&nbsp;{page}</span>
    </span>
  );
}
