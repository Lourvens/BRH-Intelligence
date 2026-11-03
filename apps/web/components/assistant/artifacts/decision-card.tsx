import { Braces } from "lucide-react";

import type { ChatArtifact } from "@/lib/chat/types";

export function DecisionCard({ artifact }: { artifact: ChatArtifact }) {
  return (
    <details className="group mt-1">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 py-1.5 text-[11px] text-ink-muted hover:text-navy-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
        <Braces className="size-3 text-ink-muted" aria-hidden />
        <span>Détails techniques de la visualisation</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wide">
          JSON
        </span>
      </summary>
      <div className="border-t border-border py-2">
        <pre className="max-h-48 overflow-auto bg-surface-alt p-2.5 font-mono text-[11px] leading-relaxed text-ink">
{JSON.stringify(artifact.decision, null, 2)}
        </pre>
      </div>
    </details>
  );
}
