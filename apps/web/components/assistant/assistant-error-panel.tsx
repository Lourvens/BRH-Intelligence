"use client";

import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import type {
  AssistantErrorActionHandlers,
  AssistantErrorView,
} from "@/lib/chat/assistant-error-view";

import { AssistantErrorGlyph } from "./assistant-error-glyph";

/**
 * Workspace-level error state: the destination itself is unusable (missing
 * conversation, refused access). It takes the place of the transcript and the
 * composer because there is nothing safe to type into.
 */
export function AssistantErrorPanel({
  view,
  actions,
}: {
  view: AssistantErrorView;
  actions: AssistantErrorActionHandlers;
}) {
  const container = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const available = view.actions.filter((action) => actions[action.id]);

  // A dead deep link lands here on mount: move focus into the explanation.
  useEffect(() => {
    container.current?.focus({ preventScroll: true });
  }, [view.title]);

  return (
    <motion.div
      ref={container}
      tabIndex={-1}
      role="alert"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-14 text-center outline-none sm:py-20"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-surface-alt/60 text-scarlet">
        <AssistantErrorGlyph icon={view.icon} className="size-6" />
      </div>
      {view.code ? (
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Erreur {view.code}
        </p>
      ) : null}
      <h2
        id={titleId}
        className="mt-2 font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-[28px]"
      >
        {view.title}
      </h2>
      <p
        id={descriptionId}
        className="mt-3 max-w-[420px] text-small leading-7 text-ink-muted"
      >
        {view.description}
      </p>
      {available.length ? (
        <div className="mt-7 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          {available.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.variant}
              onClick={actions[action.id]}
              className={
                action.variant === "ghost"
                  ? "h-11 w-full px-5 text-ink-muted sm:w-auto"
                  : "h-11 w-full px-5 sm:w-auto"
              }
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
