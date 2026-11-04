import { Info } from "lucide-react";

export function AssistantVersionNotice() {
  return (
    <p
      role="note"
      className="mt-3 flex items-start gap-2 rounded-lg bg-surface-alt/60 px-3 py-2 text-caption leading-relaxed text-ink-muted"
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <strong className="font-medium text-ink">Version préliminaire.</strong>{" "}
        L’assistant est encore en cours de développement et peut fournir des
        réponses inexactes. Vérifiez les informations importantes dans les
        sources citées.
      </span>
    </p>
  );
}
