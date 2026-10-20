import { Braces } from "lucide-react";

import type { ChatArtifact } from "@/lib/chat/types";

export function DecisionCard({ artifact }: { artifact: ChatArtifact }) {
  return (
    <details className="group rounded-xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-navy">
          <Braces className="size-3.5 text-teal" aria-hidden />
          Décision de présentation
        </span>
        <span className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[9px] text-ink-muted">
          JSON
        </span>
      </summary>
      <div className="border-t border-border px-3.5 py-3">
        <pre className="overflow-x-auto rounded-lg bg-bg p-3 font-mono text-[10px] leading-relaxed text-ink">
{JSON.stringify(artifact.decision, null, 2)}
        </pre>
        <p className="mt-2 text-[10px] text-ink-muted">
          Rendu natif BRH. A2UI / OpenUI s&apos;active lorsque le runtime hybride
          est disponible.
        </p>
      </div>
    </details>
  );
}
