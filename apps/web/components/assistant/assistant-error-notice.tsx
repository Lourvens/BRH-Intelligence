import { Button } from "@/components/ui/button";
import type {
  AssistantErrorAction,
  AssistantErrorActionHandlers,
  AssistantErrorView,
} from "@/lib/chat/assistant-error-view";
import { cn } from "@/lib/utils";

import { AssistantErrorGlyph } from "./assistant-error-glyph";

export function AssistantErrorNotice({
  view,
  actions,
}: {
  view: AssistantErrorView;
  actions: AssistantErrorActionHandlers;
}) {
  const available = view.actions.filter((action) => actions[action.id]);

  return (
    <div
      role="alert"
      aria-atomic="true"
      className="rounded-xl border border-border border-l-2 border-l-scarlet bg-surface-alt/60 p-4"
    >
      <div className="flex items-start gap-3">
        <AssistantErrorGlyph
          icon={view.icon}
          className="mt-0.5 size-4 shrink-0 text-scarlet"
        />
        <div className="min-w-0">
          <p className="font-display text-caption font-bold text-navy-ink">
            {view.title}
          </p>
          <p className="mt-1 text-small leading-relaxed text-ink">
            {view.description}
          </p>
          {view.quota ? (
            <p className="mt-1 text-caption text-ink-muted">{view.quota}</p>
          ) : null}
          {view.waitingNote ? (
            <p className="mt-2 text-caption text-ink-muted">
              <span aria-live="off">{view.waitingNote}</span>
            </p>
          ) : null}
          {available.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {available.map((action) => (
                <ErrorActionButton
                  key={action.id}
                  action={action}
                  waiting={view.waiting}
                  onAction={actions[action.id] as () => void}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ErrorActionButton({
  action,
  waiting,
  onAction,
}: {
  action: AssistantErrorAction;
  waiting: boolean;
  onAction: () => void;
}) {
  return (
    <Button
      type="button"
      variant={action.variant}
      size="sm"
      disabled={action.id === "retry" && waiting}
      onClick={onAction}
      className={cn("min-h-10", action.variant === "ghost" && "text-ink-muted")}
    >
      {action.label}
    </Button>
  );
}
