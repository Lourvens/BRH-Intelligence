"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent } from "@/lib/agent";
import { agentMessagesToChatMessages } from "@/lib/chat/agent-messages";
import { appendAnswerDelta, parseAnswerDelta } from "@/lib/chat/answer-stream";
import { mergeActivity, parseActivity, type AgentActivity } from "@/lib/chat/agent-activity";
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
  const [requestError, setRequestError] = useState(false);
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
  const onError = useCallback(() => {
    if (stoppedByUser.current) return;
    acceptActivity.current = false;
    setRunStatus("error");
    setRequestError(true);
    clearQueuedDraft();
    setDraft(null);
  }, [clearQueuedDraft]);
  const stream = useAgent({ threadId, onThreadId, onCustomEvent, onFinish, onError });

  const publishedMessages = agentMessagesToChatMessages(stream.messages);
  const messages: ChatMessage[] = draft && publishedMessages.at(-1)?.role === "user"
    ? [...publishedMessages, { id: `answer-${draft.turnId}`, role: "assistant" as const,
        content: draft.text, streaming: true, activities }]
    : publishedMessages;
  const pendingTitle = pending.current?.text.slice(0, 48) || null;
  const threadTitle = stream.values?.title;
  const isThinking = stream.isLoading || runStatus === "running";
  const isRestoring = stream.isThreadLoading && !isThinking;

  async function send(message: { id: string; text: string }) {
    if (submitting.current) return;
    submitting.current = true;
    pending.current = message;
    setRequestError(false);
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
    } catch { onError(); }
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
    catch { setRequestError(true); setRunStatus("error"); }
    finally { setIsStopping(false); }
  }

  /** Drop the in-flight turn when the visible thread changes. */
  function resetForThreadChange(options?: { stopIfSubmitting?: boolean; clearError?: boolean }) {
    if (options?.stopIfSubmitting && submitting.current) {
      stoppedByUser.current = true;
      acceptActivity.current = false;
      clearQueuedDraft();
      void stream.stop().catch(() => setRequestError(true));
    }
    setDraft(null);
    setActivities([]);
    setRunStatus("idle");
    pending.current = null;
    if (options?.clearError) setRequestError(false);
  }

  return {
    messages, pendingTitle, threadTitle, activities, runStatus, requestError,
    streamError: Boolean(stream.error), isThinking, isRestoring, isStopping,
    send, retry, stopThinking, resetForThreadChange,
  };
}
