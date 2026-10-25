import { FileText, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { TableArtifact } from "@/lib/chat/types";

export function ArtifactHeader({ artifact, icon: Icon, label, actions }: {
  artifact: TableArtifact;
  icon: LucideIcon;
  label: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-border px-4 py-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted"><Icon className="size-3.5" aria-hidden />{label}</span>
        {actions}
      </div>
      <figcaption className="min-w-0 font-display text-small font-semibold leading-6 text-navy-ink">{artifact.title}</figcaption>
      <p className="mt-1 text-caption leading-5 text-ink-muted">{artifact.subtitle}</p>
    </div>
  );
}

export function ArtifactProvenance({ source }: { source: string }) {
  return <div className="flex items-start gap-2 border-t border-border px-4 py-3 text-caption leading-5 text-ink-muted"><FileText className="mt-0.5 size-3.5 shrink-0 text-gold-ink" aria-hidden /><span>Source : {source}</span></div>;
}
