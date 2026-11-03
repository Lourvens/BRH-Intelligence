import { FileText, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { TableArtifact } from "@/lib/chat/types";

export function ArtifactHeader({ artifact, icon: Icon, label, actions }: {
  artifact: TableArtifact;
  icon?: LucideIcon;
  label?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <figcaption className="truncate font-display text-small font-semibold leading-6 text-navy-ink">
          {artifact.title}
        </figcaption>
        <p className="mt-0.5 text-caption leading-5 text-ink-muted">
          {artifact.subtitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {Icon && label ? (
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-ink-muted sm:inline-flex">
            <Icon className="size-3.5" aria-hidden />
            {label}
          </span>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

export function ArtifactProvenance({ source }: { source: string }) {
  return <div className="flex items-start gap-1.5 px-4 pb-2.5 pt-1 text-[11px] leading-4 text-ink-muted"><FileText className="mt-0.5 size-3 shrink-0 text-gold-ink" aria-hidden /><span>Source : {source}</span></div>;
}
