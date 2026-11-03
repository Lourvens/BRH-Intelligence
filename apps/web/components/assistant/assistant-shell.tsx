"use client";

import { useEffect, useRef } from "react";

import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAssistantWorkspace } from "@/lib/hooks/use-assistant-workspace";

import { ChatPanel } from "./chat-panel";
import { ConversationSidebar } from "./sidebar";
import { SourcesPanel } from "./sources-panel";

export function AssistantShell() {
  const {
    threads,
    activeThread,
    activeThreadId,
    citations,
    selectedCitation,
    isThinking,
    activities,
    runStatus,
    isRestoring,
    isStopping,
    error,
    retry,
    sourcesOpen,
    setSourcesOpen,
    selectThread,
    newThread,
    submitQuestion,
    stopThinking,
    selectCitation,
  } = useAssistantWorkspace();

  const initialQuestionSent = useRef(false);

  // The landing form sends `/assistant?q=…`; start it once, then let the
  // workspace replace the URL with the real thread path.
  useEffect(() => {
    if (initialQuestionSent.current || isRestoring) return;
    const question = new URLSearchParams(window.location.search)
      .get("q")
      ?.trim();
    if (!question) return;
    initialQuestionSent.current = true;
    window.history.replaceState(null, "", "/assistant");
    submitQuestion(question);
  }, [isRestoring, submitQuestion]);

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

      <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-surface">
        <div className="flex min-h-0 flex-1">
          <ChatPanel
            sourceCount={citations.length}
            onOpenSources={() => setSourcesOpen(true)}
            thread={activeThread}
            isThinking={isThinking}
            activities={activities}
            runStatus={runStatus}
            isRestoring={isRestoring}
            isStopping={isStopping}
            error={error}
            onRetry={retry}
            selectedCitationId={selectedCitation?.id ?? null}
            onSelectCitation={selectCitation}
            onSubmit={submitQuestion}
            onStop={stopThinking}
          />

        </div>
      </SidebarInset>

      <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[min(380px,94vw)] gap-0 rounded-none bg-surface p-0 shadow-none sm:max-w-[400px]"
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
