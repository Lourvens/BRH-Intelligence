"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { submitFeedback } from "@/lib/feedback/client";
import { feedbackLimits, feedbackMessageError, type FeedbackCategory } from "@/lib/feedback/types";

export function useFeedback({ threadId, answerExcerpt }: { threadId?: string | null; answerExcerpt?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>(answerExcerpt ? "inaccuracy" : "suggestion");
  const [message, setMessage] = useState("");
  const [includeAnswer, setIncludeAnswer] = useState(false);
  const [pending, setPending] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => controller.current?.abort(), []);

  function changeOpen(value: boolean) {
    if (pendingRef.current) return;
    if (value && submittedId) {
      setSubmittedId(null);
      setMessage("");
      setIncludeAnswer(false);
      setError(null);
    }
    setOpen(value);
  }

  async function submit() {
    if (pendingRef.current || submittedId) return;
    const validationError = feedbackMessageError(message);
    setError(validationError);
    if (validationError) {
      messageRef.current?.focus();
      return;
    }
    pendingRef.current = true;
    setPending(true);
    controller.current = new AbortController();
    try {
      const response = await submitFeedback({
        category,
        message,
        page_path: pathname.slice(0, feedbackLimits.pagePathMax),
        thread_id: threadId ?? pathname.match(/^\/assistant\/([^/]+)$/)?.[1] ?? null,
        answer_excerpt: includeAnswer && answerExcerpt ? answerExcerpt.slice(0, feedbackLimits.answerExcerptMax) : null,
      }, controller.current.signal);
      setSubmittedId(response.id);
    } catch (failure) {
      if (controller.current.signal.aborted) return;
      setError(failure instanceof Error && failure.name !== "TimeoutError"
        ? failure.message
        : "L’envoi prend trop de temps. Votre texte est conservé : réessayez.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return { open, changeOpen, category, setCategory, message, setMessage, includeAnswer, setIncludeAnswer, pending, submittedId, error, messageRef, submit };
}
