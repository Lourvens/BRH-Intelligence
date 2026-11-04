import { Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { rateLimitPresentation, type AssistantError } from "@/lib/chat/assistant-error";

export function AssistantErrorNotice({
  error,
  remainingSeconds,
  onRetry,
  onEdit,
}: {
  error: AssistantError;
  remainingSeconds: number;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const rateLimited = error.kind === "rate_limit";
  const waiting = rateLimited && remainingSeconds > 0;
  const presentation = rateLimitPresentation(error);
  const title = rateLimited
    ? presentation.title
    : error.kind === "connection"
      ? "Connexion interrompue"
      : "L’assistant est indisponible";

  return (
    <div
      role="alert"
      aria-atomic="true"
      className="rounded-xl border border-border border-l-2 border-l-scarlet bg-surface-alt/60 p-4"
    >
      <div className="flex items-start gap-3">
        <Timer className="mt-0.5 size-4 shrink-0 text-scarlet" aria-hidden />
        <div className="min-w-0">
          <p className="font-display text-caption font-bold text-navy-ink">
            {title}
          </p>
          <p className="mt-1 text-small leading-relaxed text-ink">
            {error.message}
          </p>
          {rateLimited && presentation.quota ? (
            <p className="mt-1 text-caption text-ink-muted">{presentation.quota}</p>
          ) : null}
          {rateLimited ? (
            <p className="mt-2 text-caption text-ink-muted">
              {waiting ? (
                <span aria-live="off">
                  Nouvelle tentative possible dans{" "}
                  <span className="font-medium text-ink">{remainingSeconds} s</span>.
                </span>
              ) : (
                "Vous pouvez réessayer maintenant."
              )}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={waiting}
              onClick={onRetry}
              className="min-h-10"
              aria-label={
                waiting
                  ? `Réessayer dans ${remainingSeconds} secondes`
                  : "Réessayer la question"
              }
            >
              {waiting ? `Réessayer dans ${remainingSeconds} s` : "Réessayer"}
            </Button>
            {presentation.showEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="min-h-10 text-ink-muted"
              >
                Modifier la question
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
