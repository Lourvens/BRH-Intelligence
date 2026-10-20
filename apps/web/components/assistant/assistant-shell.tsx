"use client";

import { BookOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { uniqueCitations } from "@/lib/chat/citations";
import { demoThreads, findDemoAnswer } from "@/lib/chat/demo";
import { suggestedQuestions } from "@/lib/chat/suggestions";
import type { ChatThread } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

import { ChatPanel } from "./chat-panel";
import { ConversationSidebar } from "./sidebar";
import { SourcesPanel } from "./sources-panel";
import { SourcesRail } from "./sources-rail";

export function AssistantShell() {
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
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setSourcesOpen(true);
    }
  }

  return (
    <SidebarProvider className="h-dvh overflow-hidden">
      <Sidebar collapsible="icon" className="border-r border-border">
        <ConversationSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={selectThread}
          onNewThread={newThread}
        />
      </Sidebar>

      <SidebarInset className="relative min-h-0 overflow-hidden bg-bg">
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2">
          <SidebarTrigger
            aria-label="Ouvrir les conversations"
            className="pointer-events-auto size-9 border border-border bg-surface text-ink-muted shadow-sm hover:bg-surface-alt hover:text-navy-ink md:hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSourcesOpen(true)}
            className="pointer-events-auto ml-auto gap-1.5 rounded border-border bg-surface-alt px-2.5 text-[11px] font-medium text-navy-ink hover:bg-border/50 xl:hidden"
          >
            <BookOpen className="size-3.5 text-teal" aria-hidden />
            Sources ({citations.length})
          </Button>
        </div>
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
          <aside
            className={cn(
              "hidden shrink-0 overflow-hidden border-l border-border xl:flex",
              sourcesCollapsed ? "w-12" : "w-[360px]",
            )}
          >
            {sourcesCollapsed ? (
              <SourcesRail
                count={citations.length}
                onOpen={() => setSourcesCollapsed(false)}
              />
            ) : (
              <SourcesPanel
                citations={citations}
                selected={selectedCitation}
                onSelect={selectCitation}
                onCollapse={() => setSourcesCollapsed(true)}
              />
            )}
          </aside>
        </div>
      </SidebarInset>

      <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[min(360px,92vw)] gap-0 p-0 sm:max-w-[400px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sources documentaires</SheetTitle>
            <SheetDescription>
              Les documents et pages qui soutiennent la réponse.
            </SheetDescription>
          </SheetHeader>
          <SourcesPanel
            citations={citations}
            selected={selectedCitation}
            onSelect={selectCitation}
            onClose={() => setSourcesOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
