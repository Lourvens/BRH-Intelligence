"use client";

import { answerWithSources } from "@/lib/chat/share-answer";
import type { ChatCitation } from "@/lib/chat/types";
import { useActionFeedback } from "./use-action-feedback";

export function useCopyAnswer(
  content: string,
  citations: readonly ChatCitation[],
) {
  const feedback = useActionFeedback();
  const text = answerWithSources(content, citations);

  function copy() {
    return feedback.run(() => navigator.clipboard.writeText(text));
  }

  return { copyState: feedback.state, copy };
}
