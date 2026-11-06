"use client";

import { useRouter } from "next/navigation";

import type { AssistantErrorActionHandlers } from "@/lib/chat/assistant-error-view";

/**
 * Wire each recovery action once, so the inline notice and the workspace panel
 * cannot drift apart. An action without a handler is never rendered.
 */
export function useAssistantErrorActions({
  retry,
  newThread,
  forget,
  canForget,
}: {
  retry: () => void;
  newThread: () => void;
  forget: () => void;
  canForget: boolean;
}): AssistantErrorActionHandlers {
  const router = useRouter();

  function focusComposer() {
    document
      .querySelector<HTMLTextAreaElement>("[data-assistant-composer]")
      ?.focus();
  }

  return {
    retry,
    edit: focusComposer,
    // The panel unmounts with the button that was focused: hand focus to the
    // composer of the fresh conversation instead of dropping it on <body>.
    "new-thread": () => {
      newThread();
      window.requestAnimationFrame(focusComposer);
    },
    reload: () => window.location.reload(),
    explore: () => router.push("/brh-corpus"),
    ...(canForget
      ? { forget: () => { forget(); window.requestAnimationFrame(focusComposer); } }
      : {}),
  };
}
