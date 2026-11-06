"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  forgetThread as forgetRemoteThread,
  listThreads,
  restoreThread,
  saveThread,
  serverThreadInfo,
} from "@/lib/assistant/threads";
import { threadIdFromPath, threadPath } from "@/lib/chat/thread-path";
import {
  createThreadInfo, readStoredThreads, threadGroup, writeStoredThreads, type ThreadInfo,
} from "@/lib/chat/thread-storage";
import { useAssistantStream } from "@/lib/hooks/use-assistant-stream";
import type { ChatThread } from "@/lib/chat/types";

export function useAssistantWorkspace() {
  const pathname = usePathname();
  const urlThreadId = threadIdFromPath(pathname);
  const [threadInfo, setThreadInfo] = useState<ThreadInfo[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(urlThreadId);
  // The stream only sees a thread once it is known to the server; a deep link
  // waits for the restore call so it does not 404 against an empty runtime.
  const [streamThreadId, setStreamThreadId] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(Boolean(urlThreadId));
  const restored = useRef(new Set<string>());
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(true);

  const handleThreadId = useCallback((id: string, pendingText: string | null) => {
    restored.current.add(id);
    setStreamThreadId(id);
    setActiveThreadId(id);
    const now = new Date();
    const info = createThreadInfo(id, pendingText, now);
    setThreadInfo((current) => current.some((thread) => thread.id === id)
      ? current.map((thread) => thread.id === id
        ? { ...thread, updatedAt: now.toISOString(), group: threadGroup(now, now) }
        : thread)
      : [info, ...current]);
    void saveThread(id, info.title).catch(() => undefined);
  }, []);
  const touchThread = useCallback((id: string) => {
    const now = new Date();
    setThreadInfo((current) => current.map((thread) => thread.id === id
      ? { ...thread, updatedAt: now.toISOString(), group: threadGroup(now, now) }
      : thread));
  }, []);
  const resetSelection = useCallback(() => {
    setSelectedMessageId(null);
    setSelectedCitationId(null);
  }, []);

  const stream = useAssistantStream({
    threadId: streamThreadId,
    onThreadId: handleThreadId,
    onSelectionReset: resetSelection,
  });

  // Restore the runtime row before the stream asks for history.
  useEffect(() => {
    if (!activeThreadId) {
      setStreamThreadId(null);
      setIsHydrating(false);
      return;
    }
    if (restored.current.has(activeThreadId)) {
      setStreamThreadId(activeThreadId);
      setIsHydrating(false);
      return;
    }
    let cancelled = false;
    setStreamThreadId(null);
    setIsHydrating(true);
    void restoreThread(activeThreadId)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        restored.current.add(activeThreadId);
        setStreamThreadId(activeThreadId);
        setIsHydrating(false);
      });
    return () => { cancelled = true; };
  }, [activeThreadId]);

  // Durable index first; the browser cache only covers an unreachable service.
  useEffect(() => {
    let cancelled = false;
    void listThreads()
      .then((items) => {
        if (!cancelled) setThreadInfo(items.map(serverThreadInfo));
      })
      .catch(() => {
        if (!cancelled) setThreadInfo(readStoredThreads());
      });
    return () => { cancelled = true; };
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
        return [createThreadInfo(activeThreadId, title), ...current];
      }
      return current.map((thread) =>
        thread.id === activeThreadId && thread.title !== title ? { ...thread, title } : thread);
    });
    void saveThread(activeThreadId, title).catch(() => undefined);
  }, [activeThreadId, stream.threadTitle]);

  const { messages, pendingTitle, threadTitle } = stream;
  const activeInfo = threadInfo.find((thread) => thread.id === activeThreadId);
  const activeThread: ChatThread | null = activeThreadId || messages.length ? {
    id: activeThreadId || "pending",
    title: threadTitle || activeInfo?.title || pendingTitle || "Conversation",
    updatedAt: activeInfo?.updatedAt ?? new Date().toISOString(),
    group: activeInfo?.group ?? "Aujourd’hui",
    messages,
  } : null;
  const threads = threadInfo.map((thread) => ({
    ...thread, messages: thread.id === activeThreadId ? messages : [],
  }));
  const selectedAnswer = messages.find((message) => message.id === selectedMessageId) ??
    messages.findLast((message) => message.role === "assistant");
  const citations = selectedAnswer?.citations ?? [];
  const selectedCitation = citations.find((citation) => citation.id === selectedCitationId) ??
    citations[0] ?? null;
  const isBusy = stream.isThinking || stream.isRestoring || isHydrating;
  const canForget = Boolean(
    activeThreadId && threadInfo.some((thread) => thread.id === activeThreadId),
  );

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

  /** Drop a conversation from the index, then start a fresh one. */
  function forgetThread() {
    if (!activeThreadId) return;
    const forgotten = activeThreadId;
    void forgetRemoteThread(forgotten).catch(() => undefined);
    setThreadInfo((current) => current.filter((thread) => thread.id !== forgotten));
    newThread();
  }

  function submitQuestion(question: string) {
    const text = question.trim();
    if (!text || text.length > 4000 || isBusy) return;
    if (activeThreadId) touchThread(activeThreadId);
    void stream.send({ id: crypto.randomUUID(), text });
  }

  function retry() {
    if (activeThreadId) touchThread(activeThreadId);
    stream.retry();
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
    isRestoring: stream.isRestoring || isHydrating, isStopping: stream.isStopping,
    error: stream.error, errorPrompt: stream.errorPrompt,
    retry, sourcesOpen, setSourcesOpen, sourcesCollapsed, setSourcesCollapsed,
    selectThread, newThread, submitQuestion, stopThinking: stream.stopThinking, selectCitation,
    forgetThread, canForget,
  };
}
