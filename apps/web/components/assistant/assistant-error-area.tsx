"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type {
  AssistantErrorActionHandlers,
  AssistantErrorView,
} from "@/lib/chat/assistant-error-view";
import { feedbackTransition } from "@/lib/motion";

import { AssistantErrorNotice } from "./assistant-error-notice";

export function AssistantErrorArea({
  view,
  actions,
}: {
  view: AssistantErrorView | null;
  actions: AssistantErrorActionHandlers;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {view ? (
        <motion.div
          key={`${view.kind}:${view.title}`}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
          transition={reduceMotion ? { duration: 0 } : feedbackTransition}
        >
          <AssistantErrorNotice view={view} actions={actions} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
