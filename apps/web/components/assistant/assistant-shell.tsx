"use client";

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
import { cn } from "@/lib/utils";

import { ChatPanel } from "./chat-panel";
import { ConversationSidebar } from "./sidebar";
import { SourcesPanel } from "./sources-panel";
import { SourcesRail } from "./sources-rail";

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
    sourcesCollapsed,
    setSourcesCollapsed,
    selectThread,
    newThread,
    submitQuestion,
    stopThinking,
    selectCitation,
  } = useAssistantWorkspace();

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
          {(activeThread || isThinking) && (
            <aside
              className={cn(
                "hidden shrink-0 overflow-hidden border-l border-border xl:flex",
                sourcesCollapsed ? "w-12" : "w-[320px] 2xl:w-[352px]",
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
          )}
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
