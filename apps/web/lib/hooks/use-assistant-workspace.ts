"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { threadIdFromPath, threadPath } from "@/lib/chat/thread-path";
import {
  createThreadInfo, readStoredThreads, writeStoredThreads, type ThreadInfo,
} from "@/lib/chat/thread-storage";
import { useAssistantStream } from "@/lib/hooks/use-assistant-stream";
import type { ChatThread } from "@/lib/chat/types";

export function useAssistantWorkspace() {
  const pathname = usePathname();
  const urlThreadId = threadIdFromPath(pathname);
  const [threadInfo, setThreadInfo] = useState<ThreadInfo[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(urlThreadId);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(true);

  const handleThreadId = useCallback((id: string, pendingText: string | null) => {
    setActiveThreadId(id);
    setThreadInfo((current) => current.some((thread) => thread.id === id)
      ? current
      : [createThreadInfo(id, pendingText), ...current]);
  }, []);
  const resetSelection = useCallback(() => {
    setSelectedMessageId(null);
    setSelectedCitationId(null);
  }, []);

  const stream = useAssistantStream({
    threadId: activeThreadId,
    onThreadId: handleThreadId,
    onSelectionReset: resetSelection,
  });

  useEffect(() => {
    const stored = readStoredThreads();
    if (stored.length) setThreadInfo(stored);
  }, []);

  useEffect(() => {
    if (urlThreadId === activeThreadId) return;
    void stream.resetForThreadChange({ stopIfSubmitting: true });
    setActiveThreadId(urlThreadId);
    setSelectedMessageId(null);
    setSelectedCitationId(null);
    setSourcesOpen(false);
  }, [urlThreadId]);

  useEffect(() => {
    if (!threadInfo.length) return;
    writeStoredThreads(threadInfo, activeThreadId);
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

  useEffect(() => {
    const title = stream.threadTitle;
    if (!activeThreadId || !title) return;
    setThreadInfo((current) => {
      if (!current.some((thread) => thread.id === activeThreadId)) {
        return [{ id: activeThreadId, title, updatedAt: "À l’instant", group: "Aujourd’hui" }, ...current];
      }
      return current.map((thread) =>
        thread.id === activeThreadId && thread.title !== title ? { ...thread, title } : thread);
    });
  }, [activeThreadId, stream.threadTitle]);

  const { messages, pendingTitle, threadTitle } = stream;
  const activeInfo = threadInfo.find((thread) => thread.id === activeThreadId);
  const activeThread: ChatThread | null = activeThreadId || messages.length ? {
    id: activeThreadId || "pending",
    title: threadTitle || activeInfo?.title || pendingTitle || "Conversation",
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
  const isBusy = stream.isThinking || stream.isRestoring;

  function selectThread(id: string) {
    if (isBusy) return;
    stream.resetForThreadChange({ clearError: true });
    setActiveThreadId(id);
    if (window.location.pathname !== threadPath(id)) window.history.pushState(null, "", threadPath(id));
    setSelectedMessageId(null);
    setSelectedCitationId(null);
    setSourcesOpen(false);
  }

  function newThread() {
    if (isBusy) return;
    stream.resetForThreadChange({ clearError: true });
    setActiveThreadId(null);
    if (window.location.pathname !== threadPath(null)) window.history.pushState(null, "", threadPath(null));
    setSelectedMessageId(null);
    setSelectedCitationId(null);
    setSourcesOpen(false);
  }

  function submitQuestion(question: string) {
    const text = question.trim();
    if (!text || text.length > 4000 || isBusy) return;
    void stream.send({ id: crypto.randomUUID(), text });
  }

  function selectCitation(citationId: string, messageId?: string) {
    if (messageId) setSelectedMessageId(messageId);
    setSelectedCitationId(citationId);
    setSourcesCollapsed(false);
    if (window.matchMedia("(max-width: 1279px)").matches) setSourcesOpen(true);
  }

  return {
    threads, activeThread, activeThreadId, citations, selectedCitation,
    isThinking: stream.isThinking, activities: stream.activities, runStatus: stream.runStatus,
    isRestoring: stream.isRestoring, isStopping: stream.isStopping,
    error: stream.error, errorPrompt: stream.errorPrompt,
    retry: stream.retry, sourcesOpen, setSourcesOpen, sourcesCollapsed, setSourcesCollapsed,
    selectThread, newThread, submitQuestion, stopThinking: stream.stopThinking, selectCitation,
  };
}
