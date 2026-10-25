"use client";

import { answerWithSources } from "@/lib/chat/share-answer";
import type { ChatCitation } from "@/lib/chat/types";
import { useActionFeedback } from "./use-action-feedback";

export function useAnswerActions(content: string, citations: readonly ChatCitation[]) {
  const copyFeedback = useActionFeedback();
  const shareFeedback = useActionFeedback();
  const text = answerWithSources(content, citations);

  function copy() {
    return copyFeedback.run(() => navigator.clipboard.writeText(text));
  }

  function share() {
    return shareFeedback.run(async () => {
      const data = { title: "BRH Intelligence", text };
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        try {
          await navigator.share(data);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") throw error;
        }
      }
      await navigator.clipboard.writeText(text);
      return "fallback";
    });
  }

  return { copyState: copyFeedback.state, shareState: shareFeedback.state, copy, share };
}
