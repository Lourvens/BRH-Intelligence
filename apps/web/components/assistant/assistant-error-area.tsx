"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { feedbackTransition } from "@/lib/motion";
import type { AssistantError } from "@/lib/chat/assistant-error";

import { AssistantErrorNotice } from "./assistant-error-notice";

export function AssistantErrorArea({
  error,
  remainingSeconds,
  onRetry,
  onEdit,
}: {
  error: AssistantError | null;
  remainingSeconds: number;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {error ? (
        <motion.div
          key={`${error.kind}:${error.status ?? "none"}:${error.retryAfterSeconds ?? "none"}`}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
          transition={reduceMotion ? { duration: 0 } : feedbackTransition}
        >
          <AssistantErrorNotice
            error={error}
            remainingSeconds={remainingSeconds}
            onRetry={onRetry}
            onEdit={onEdit}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
