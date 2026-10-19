import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A full-width source card for the agent trace. The chat will turn this into
 * a link to `/documents/{slug}?page=N`; for now it exposes the same shape.
 */
export function CitationCard({
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
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-azure/30 bg-surface-alt px-3 py-2.5",
        className,
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-navy text-micro font-semibold text-white">
        {index}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-micro font-medium text-ink">
          {title}
        </span>
        <span className="block text-[10px] text-ink-muted">
          PDF officiel · page {page}
        </span>
      </span>

      <span className="shrink-0 rounded-sm border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-muted">
        p.&nbsp;{page}
      </span>
      <ExternalLink className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
    </div>
  );
}
