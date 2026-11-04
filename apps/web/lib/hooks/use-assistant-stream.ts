"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAgent } from "@/lib/agent";
import { agentMessagesToChatMessages } from "@/lib/chat/agent-messages";
import { retainPublishedActivity } from "@/lib/chat/activity-presentation";
import { appendAnswerDelta, parseAnswerDelta } from "@/lib/chat/answer-stream";
import { mergeActivity, parseActivity, type AgentActivity } from "@/lib/chat/agent-activity";
import { normalizeAssistantError, type AssistantError } from "@/lib/chat/assistant-error";
import { threadPath } from "@/lib/chat/thread-path";
import type { ChatMessage } from "@/lib/chat/types";

type AnswerDraft = { turnId: string; text: string; sequence?: number };

export type RunStatus = "idle" | "running" | "stopped" | "error";

/**
 * Assistant stream boundary: owns the LangGraph stream, the buffered answer
 * draft, activity events and the send/retry/stop controls.
 */
export function useAssistantStream(options: {
  threadId: string | null;
  onThreadId: (id: string, pendingText: string | null) => void;
  onSelectionReset: () => void;
}) {
  const { threadId, onThreadId: onThreadIdChange, onSelectionReset } = options;
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [draft, setDraft] = useState<AnswerDraft | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [isStopping, setIsStopping] = useState(false);
  const [requestError, setRequestError] = useState<AssistantError | null>(null);
  const [errorPrompt, setErrorPrompt] = useState<string | null>(null);
  const acceptActivity = useRef(false);
  const currentTurn = useRef<string | null>(null);
  const queuedDraft = useRef<AnswerDraft | null>(null);
  const frame = useRef<number | null>(null);

  const clearQueuedDraft = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    queuedDraft.current = null;
  }, []);

  useEffect(() => () => clearQueuedDraft(), [clearQueuedDraft]);
  const stoppedByUser = useRef(false);
  const pending = useRef<{ id: string; text: string } | null>(null);
  const submitting = useRef(false);

  const onThreadId = useCallback((id: string) => {
    onThreadIdChange(id, pending.current?.text ?? null);
    if (window.location.pathname !== threadPath(id)) window.history.replaceState(null, "", threadPath(id));
  }, [onThreadIdChange]);
  const onCustomEvent = useCallback((data: unknown) => {
    if (!acceptActivity.current) return;
    const delta = parseAnswerDelta(data);
    if (delta) {
      if (currentTurn.current !== delta.turnId) return;
      queuedDraft.current = appendAnswerDelta(queuedDraft.current, delta);
      if (frame.current === null) {
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          const queued = queuedDraft.current;
          queuedDraft.current = null;
          if (queued && acceptActivity.current && currentTurn.current === queued.turnId) {
            setDraft((previous) => appendAnswerDelta(previous, queued));
          }
        });
      }
      return;
    }
    const event = parseActivity(data);
    if (event) {
      if (!currentTurn.current && event.stage === "route_intent") currentTurn.current = event.turn_id;
      if (event.turn_id !== currentTurn.current) return;
      setActivities((previous) => mergeActivity(previous, event));
    }
  }, []);
  const onFinish = useCallback(() => {
    acceptActivity.current = false;
    clearQueuedDraft();
    setRunStatus((current) => current === "running" ? "idle" : current);
  }, [clearQueuedDraft]);
  const onError = useCallback((cause?: unknown) => {
    if (stoppedByUser.current) return;
    acceptActivity.current = false;
    setRunStatus("error");
    setRequestError(normalizeAssistantError(cause));
    setErrorPrompt(submitting.current ? pending.current?.text ?? null : null);
    clearQueuedDraft();
  }, [clearQueuedDraft]);
  const stream = useAgent({ threadId, onThreadId, onCustomEvent, onFinish, onError });

  const publishedMessages = retainPublishedActivity(
    agentMessagesToChatMessages(stream.messages), activities,
  );
  const messages: ChatMessage[] = draft && publishedMessages.at(-1)?.role === "user"
    ? [...publishedMessages, { id: `answer-${draft.turnId}`, role: "assistant" as const,
        content: draft.text, streaming: runStatus === "running", activities }]
    : publishedMessages;
  const pendingTitle = pending.current?.text.slice(0, 48) || null;
  const threadTitle = stream.values?.title;
  const isThinking = stream.isLoading || runStatus === "running";
  const isRestoring = stream.isThreadLoading && !isThinking;

  async function send(message: { id: string; text: string }) {
    if (submitting.current) return;
    submitting.current = true;
    pending.current = message;
    setRequestError(null);
    setErrorPrompt(null);
    setActivities([]);
    clearQueuedDraft();
    setDraft(null);
    setRunStatus("running");
    stoppedByUser.current = false;
    acceptActivity.current = true;
    currentTurn.current = null;
    onSelectionReset();
    try {
      await stream.submit({ messages: [{ type: "human", content: message.text, id: message.id }] }, {
        streamMode: ["values", "custom"],
        config: { recursion_limit: 80 },
        optimisticValues: (previous) => ({
          messages: [...(previous.messages ?? []).filter((item) => item.id !== message.id),
            { type: "human", content: message.text, id: message.id }],
        }),
        onError,
      });
    } catch (error) { onError(error); }
    finally {
      submitting.current = false;
      acceptActivity.current = false;
      setRunStatus((current) => current === "running" ? "idle" : current);
    }
  }

  function retry() {
    if (isThinking || isRestoring) return;
    const lastQuestion = messages.findLast((message) => message.role === "user");
    const message = pending.current ?? (lastQuestion ? {
      id: lastQuestion.id, text: lastQuestion.content,
    } : null);
    if (message) void send(message);
  }

  async function stopThinking() {
    if (isStopping) return;
    setIsStopping(true);
    stoppedByUser.current = true;
    acceptActivity.current = false;
    clearQueuedDraft();
    setDraft(null);
    setRunStatus("stopped");
    try { await stream.stop(); }
    catch (error) { setRequestError(normalizeAssistantError(error)); setRunStatus("error"); }
    finally { setIsStopping(false); }
  }

  /** Drop the in-flight turn when the visible thread changes. */
  function resetForThreadChange(options?: { stopIfSubmitting?: boolean; clearError?: boolean }) {
    if (options?.stopIfSubmitting && submitting.current) {
      stoppedByUser.current = true;
      acceptActivity.current = false;
      clearQueuedDraft();
      void stream.stop().catch(() => setRequestError(normalizeAssistantError(undefined)));
    }
    setDraft(null);
    setActivities([]);
    setRunStatus("idle");
    pending.current = null;
    setErrorPrompt(null);
    if (options?.clearError) setRequestError(null);
  }

  const streamError = useMemo(
    () => (stream.error ? normalizeAssistantError(stream.error) : null),
    [stream.error],
  );
  return {
    messages, pendingTitle, threadTitle, activities, runStatus,
    error: requestError ?? streamError, errorPrompt, requestError: Boolean(requestError),
    streamError: Boolean(stream.error), isThinking, isRestoring, isStopping,
    send, retry, stopThinking, resetForThreadChange,
  };
}
