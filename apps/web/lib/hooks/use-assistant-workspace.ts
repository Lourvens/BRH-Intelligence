"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent } from "@/lib/agent";
import { agentMessagesToChatMessages } from "@/lib/chat/agent-messages";
import { mergeActivity, parseActivity, type AgentActivity } from "@/lib/chat/agent-activity";
import type { ChatThread } from "@/lib/chat/types";

type ThreadInfo = Omit<ChatThread, "messages">;
const STORAGE_KEY = "brh:assistant:threads:v1";

export function useAssistantWorkspace() {
  const [threadInfo, setThreadInfo] = useState<ThreadInfo[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [requestError, setRequestError] = useState(false);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "stopped" | "error">("idle");
  const [isStopping, setIsStopping] = useState(false);
  const acceptActivity = useRef(false);
  const stoppedByUser = useRef(false);
  const pending = useRef<{ id: string; text: string } | null>(null);
  const submitting = useRef(false);

  const onThreadId = useCallback((id: string) => {
    setActiveThreadId(id);
    setThreadInfo((current) => current.some((thread) => thread.id === id) ? current : [{
      id, title: pending.current?.text.slice(0, 48) || "Conversation",
      updatedAt: "À l’instant", group: "Aujourd’hui",
    }, ...current]);
  }, []);
  const onCustomEvent = useCallback((data: unknown) => {
    if (!acceptActivity.current) return;
    const event = parseActivity(data);
    if (event) setActivities((previous) => mergeActivity(previous, event));
  }, []);
  const onFinish = useCallback(() => {
    acceptActivity.current = false;
    setRunStatus((current) => current === "running" ? "idle" : current);
  }, []);
  const onError = useCallback(() => {
    if (stoppedByUser.current) return;
    acceptActivity.current = false;
    setRunStatus("error");
    setRequestError(true);
  }, []);
  const stream = useAgent({ threadId: activeThreadId, onThreadId, onCustomEvent, onFinish, onError });

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object" && "threads" in saved && "activeId" in saved) {
        const data = saved as { threads: ThreadInfo[]; activeId: string | null };
        if (Array.isArray(data.threads) && data.threads.every((thread) =>
          typeof thread.id === "string" && typeof thread.title === "string")) {
          setThreadInfo(data.threads);
          setActiveThreadId(typeof data.activeId === "string" ? data.activeId : null);
        }
      }
    } catch { /* Storage is optional; server thread state remains authoritative. */ }
  }, []);

  useEffect(() => {
    if (!threadInfo.length) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        threads: threadInfo, activeId: activeThreadId,
      }));
    } catch { /* Private browsing may disable storage. */ }
  }, [threadInfo, activeThreadId]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j" &&
          window.matchMedia("(min-width: 1280px)").matches) {
        event.preventDefault();
        setSourcesCollapsed((current) => !current);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const messages = agentMessagesToChatMessages(stream.messages);
  const activeInfo = threadInfo.find((thread) => thread.id === activeThreadId);
  const activeThread: ChatThread | null = activeThreadId || messages.length ? {
    id: activeThreadId || "pending",
    title: activeInfo?.title || pending.current?.text.slice(0, 48) || "Conversation",
    updatedAt: "À l’instant", group: "Aujourd’hui", messages,
  } : null;
  const threads = threadInfo.map((thread) => ({
    ...thread, messages: thread.id === activeThreadId ? messages : [],
  }));
  const selectedAnswer = messages.find((message) => message.id === selectedMessageId) ??
    messages.findLast((message) => message.role === "assistant");
  const citations = selectedAnswer?.citations ?? [];
  const selectedCitation = citations.find((citation) => citation.id === selectedCitationId) ??
    citations[0] ?? null;
  const isThinking = stream.isLoading || runStatus === "running";
  const isRestoring = stream.isThreadLoading && !isThinking;
  const isBusy = isThinking || isRestoring;

  function selectThread(id: string) {
    if (isBusy) return;
    setActivities([]);
    setRunStatus("idle");
    setActiveThreadId(id);
    pending.current = null;
    setSelectedMessageId(null);
    setSelectedCitationId(null);
    setSourcesOpen(false);
    setRequestError(false);
  }

  function newThread() {
    if (isBusy) return;
    setActivities([]);
    setRunStatus("idle");
    setActiveThreadId(null);
    pending.current = null;
    setSelectedMessageId(null);
    setSelectedCitationId(null);
    setSourcesOpen(false);
    setRequestError(false);
  }

  async function send(message: { id: string; text: string }) {
    if (submitting.current) return;
    submitting.current = true;
    pending.current = message;
    setRequestError(false);
    setActivities([]);
    setRunStatus("running");
    stoppedByUser.current = false;
    acceptActivity.current = true;
    setSelectedMessageId(null);
    setSelectedCitationId(null);
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

  function submitQuestion(question: string) {
    const text = question.trim();
    if (!text || text.length > 4000 || isBusy) return;
    void send({ id: crypto.randomUUID(), text });
  }

  function retry() {
    if (isBusy) return;
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
    setRunStatus("stopped");
    try { await stream.stop(); }
    catch { setRequestError(true); setRunStatus("error"); }
    finally { setIsStopping(false); }
  }

  function selectCitation(citationId: string, messageId?: string) {
    if (messageId) setSelectedMessageId(messageId);
    setSelectedCitationId(citationId);
    setSourcesCollapsed(false);
    if (window.matchMedia("(max-width: 1279px)").matches) setSourcesOpen(true);
  }

  return {
    threads, activeThread, activeThreadId, citations, selectedCitation, isThinking,
    activities, runStatus, isRestoring, isStopping,
    error: requestError || Boolean(stream.error),
    retry, sourcesOpen, setSourcesOpen, sourcesCollapsed, setSourcesCollapsed,
    selectThread, newThread, submitQuestion, stopThinking, selectCitation,
  };
}
