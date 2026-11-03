"use client";

import { answerWithSources } from "@/lib/chat/share-answer";
import { threadIdFromPath, threadShareUrl } from "@/lib/chat/thread-path";
import type { ChatCitation } from "@/lib/chat/types";
import { useActionFeedback } from "./use-action-feedback";

export function useAnswerActions(
  content: string,
  citations: readonly ChatCitation[],
  threadId: string | null,
) {
  const copyFeedback = useActionFeedback();
  const shareFeedback = useActionFeedback();
  const text = answerWithSources(content, citations);

  function copy() {
    return copyFeedback.run(() => navigator.clipboard.writeText(text));
  }

  function share() {
    return shareFeedback.run(async () => {
      const id = threadId ?? threadIdFromPath(window.location.pathname);
      const url = id
        ? threadShareUrl(id, window.location.origin)
        : window.location.href;
      const data = {
        title: "BRH Intelligence",
        text: "Conversation avec l’assistant documentaire BRH",
        url,
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        try {
          await navigator.share(data);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") throw error;
        }
      }
      await navigator.clipboard.writeText(url);
      return "fallback";
    });
  }

  return { copyState: copyFeedback.state, shareState: shareFeedback.state, copy, share };
}
