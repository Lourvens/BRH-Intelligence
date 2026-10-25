"use client";

import { useEffect, useRef, useState } from "react";
import { uniqueCitations } from "@/lib/chat/citations";
import { demoThreads, findDemoAnswer } from "@/lib/chat/demo";
import type { ChatThread } from "@/lib/chat/types";

export function useAssistantWorkspace() {
  const [threads, setThreads] = useState<ChatThread[]>(demoThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(
    null,
  );
  const [isThinking, setIsThinking] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "j" &&
        window.matchMedia("(min-width: 1280px)").matches
      ) {
        event.preventDefault();
        setSourcesCollapsed((current) => !current);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;
  const citations = uniqueCitations(
    activeThread?.messages.flatMap((message) => message.citations ?? []) ?? [],
  );
  const selectedCitation =
    citations.find((citation) => citation.id === selectedCitationId) ??
    citations[0] ??
    null;

  function selectThread(threadId: string) {
    const thread = threads.find((item) => item.id === threadId);
    const firstCitation = thread?.messages.flatMap((m) => m.citations ?? [])[0];
    setActiveThreadId(threadId);
    setSelectedCitationId(firstCitation?.id ?? null);
    setSourcesOpen(false);
  }

  function newThread() {
    setActiveThreadId(null);
    setSelectedCitationId(null);
    setSourcesOpen(false);
  }

  function submitQuestion(question: string) {
    const text = question.trim();
    if (!text || isThinking) return;

    const targetId = activeThreadId ?? `demo-${Date.now()}`;
    const existing = activeThreadId
      ? threads.find((thread) => thread.id === activeThreadId)
      : null;
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: text,
    };

    if (existing) {
      setThreads((current) =>
        current.map((thread) =>
          thread.id === targetId
            ? {
                ...thread,
                updatedAt: "À l’instant",
                messages: [...thread.messages, userMessage],
              }
            : thread,
        ),
      );
    } else {
      const title = text.length > 48 ? `${text.slice(0, 48)}…` : text;
      setThreads((current) => [
        {
          id: targetId,
          title,
          updatedAt: "À l’instant",
          group: "Aujourd’hui",
          messages: [userMessage],
        },
        ...current,
      ]);
      setActiveThreadId(targetId);
    }

    setSelectedCitationId(null);
    setIsThinking(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const answer = {
        ...findDemoAnswer(text),
        id: `answer-${Date.now()}`,
      };
      setThreads((current) =>
        current.map((thread) =>
          thread.id === targetId
            ? { ...thread, messages: [...thread.messages, answer] }
            : thread,
        ),
      );
      setSelectedCitationId(answer.citations?.[0]?.id ?? null);
      setIsThinking(false);
    }, 850);
  }

  function stopThinking() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsThinking(false);
  }

  function selectCitation(citationId: string) {
    setSelectedCitationId(citationId);
    setSourcesCollapsed(false);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setSourcesOpen(true);
    }
  }

  return {
    threads, activeThread, activeThreadId, citations, selectedCitation, isThinking,
    sourcesOpen, setSourcesOpen, sourcesCollapsed, setSourcesCollapsed,
    selectThread, newThread, submitQuestion, stopThinking, selectCitation,
  };
}
