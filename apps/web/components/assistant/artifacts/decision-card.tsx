import { Braces } from "lucide-react";

import type { ChatArtifact } from "@/lib/chat/types";

export function DecisionCard({ artifact }: { artifact: ChatArtifact }) {
  return (
    <details className="group rounded-sm border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3">
        <span className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-navy-ink">
          <Braces className="size-3.5 text-teal" aria-hidden />
          Décision de présentation
        </span>
        <span className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
          JSON
        </span>
      </summary>
      <div className="border-t border-border px-3.5 py-3">
        <pre className="overflow-x-auto rounded-sm bg-bg p-3 font-mono text-caption leading-relaxed text-ink">
{JSON.stringify(artifact.decision, null, 2)}
        </pre>
        <p className="mt-2 text-caption text-ink-muted">
          Type de visualisation et correspondance des colonnes utilisées.
        </p>
      </div>
    </details>
  );
}
