"use client";

import { useEffect, useRef, useState } from "react";

import { suggestedQuestions } from "@/lib/chat/suggestions";

import {
  demoThreads,
  findDemoAnswer,
} from "@/lib/chat/demo";
import type { ChatThread } from "@/lib/chat/types";

import { ChatHeader } from "./chat-header";
import { ChatPanel } from "./chat-panel";
import { Sidebar } from "./sidebar";
import { SourcesPanel } from "./sources-panel";

export function AssistantShell() {
  const [threads, setThreads] = useState<ChatThread[]>(demoThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(
    null,
  );
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ?? null;
  const citations =
    activeThread?.messages.flatMap((message) => message.citations ?? []) ?? [];
  const selectedCitation =
    citations.find((citation) => citation.id === selectedCitationId) ??
    citations[0] ??
    null;

  function selectThread(threadId: string) {
    const thread = threads.find((item) => item.id === threadId);
    const firstCitation = thread?.messages.flatMap((m) => m.citations ?? [])[0];
    setActiveThreadId(threadId);
    setSelectedCitationId(firstCitation?.id ?? null);
    setSidebarOpen(false);
    setSourcesOpen(false);
  }

  function newThread() {
    setActiveThreadId(null);
    setSelectedCitationId(null);
    setSidebarOpen(false);
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
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setSourcesOpen(true);
    }
  }

  return (
    <div
      id="contenu"
      className="flex h-dvh overflow-hidden bg-bg text-ink"
    >
      <aside className="hidden w-72 shrink-0 border-r border-border bg-surface lg:block">
        <Sidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={selectThread}
          onNewThread={newThread}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          title={activeThread?.title ?? "Nouvelle conversation"}
          citationCount={citations.length}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenSources={() => setSourcesOpen(true)}
        />
        <div className="flex min-h-0 flex-1">
          <ChatPanel
            thread={activeThread}
            suggestions={suggestedQuestions}
            isThinking={isThinking}
            selectedCitationId={selectedCitation?.id ?? null}
            onSelectSuggestion={selectThread}
            onSelectCitation={selectCitation}
            onSubmit={submitQuestion}
            onStop={stopThinking}
          />
          <aside className="hidden w-80 shrink-0 border-l border-border xl:block">
            <SourcesPanel
              citations={citations}
              selected={selectedCitation}
              onSelect={selectCitation}
            />
          </aside>
        </div>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Fermer les conversations"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-navy/30 backdrop-blur-sm"
          />
          <aside className="relative z-10 h-full w-[min(20rem,85vw)] bg-surface shadow-2xl">
            <Sidebar
              threads={threads}
              activeThreadId={activeThreadId}
              onSelectThread={selectThread}
              onNewThread={newThread}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {sourcesOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end xl:hidden">
          <button
            type="button"
            aria-label="Fermer les sources"
            onClick={() => setSourcesOpen(false)}
            className="absolute inset-0 bg-navy/30 backdrop-blur-sm"
          />
          <aside className="relative z-10 h-full w-[min(21rem,88vw)] shadow-2xl">
            <SourcesPanel
              citations={citations}
              selected={selectedCitation}
              onSelect={selectCitation}
              onClose={() => setSourcesOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
