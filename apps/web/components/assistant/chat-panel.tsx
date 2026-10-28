"use client";

import { Loader2, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useChatScroll } from "@/lib/hooks/use-chat-scroll";
import type { ChatThread, SuggestedQuestion } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { ChatComposer } from "./chat-composer";
import { EmptyState } from "./empty-state";
import { ExampleLinks } from "./example-links";
import { Message } from "./message";
import { WorkspaceHeader } from "./workspace-header";

export function ChatPanel({
  thread,
  suggestions,
  isThinking,
  selectedCitationId,
  onSelectSuggestion,
  onSelectCitation,
  onSubmit,
  onStop,
  sourceCount,
  onOpenSources,
}: {
  thread: ChatThread | null;
  suggestions: readonly SuggestedQuestion[];
  isThinking: boolean;
  selectedCitationId: string | null;
  onSelectSuggestion: (threadId: string) => void;
  onSelectCitation: (citationId: string) => void;
  onSubmit: (question: string) => void;
  onStop: () => void;
  sourceCount: number;
  onOpenSources: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const isEmpty = !thread && !isThinking;
  const { scrollRef, handleScroll, followMessages } = useChatScroll(
    thread?.id,
    thread?.messages.length ?? 0,
    isThinking,
    reduceMotion,
  );

  return (
    <section
      aria-label="Conversation avec l’assistant"
      className="flex min-w-0 flex-1 flex-col bg-surface"
    >
      <WorkspaceHeader
        title={thread?.title}
        sourceCount={sourceCount}
        onOpenSources={onOpenSources}
      />
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          isEmpty && "overflow-y-auto overscroll-contain",
        )}
      >
        {isEmpty && <div aria-hidden className="flex-1" />}
        {isEmpty && <EmptyState />}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            isEmpty ? "hidden" : "flex-1",
          )}
        >
          {!isEmpty && (
            <div className="px-4 py-8 sm:px-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={thread?.id ?? "no-thread"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
                  className="mx-auto flex max-w-[880px] flex-col gap-8"
                >
                  {thread?.messages.map((message) => (
                    <Message
                      key={message.id}
                      message={message}
                      selectedCitationId={selectedCitationId}
                      onSelectCitation={onSelectCitation}
                    />
                  ))}
                  {isThinking ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-start gap-3 border-t border-border py-5"
                    >
                      <Search
                        className="mt-0.5 size-5 shrink-0 text-navy-ink"
                        aria-hidden
                      />
                      <div>
                        <p className="flex items-center gap-2 text-small font-medium text-navy-ink">
                          <Loader2
                            className="size-4 motion-safe:animate-spin"
                            aria-hidden
                          />{" "}
                          Préparation de la réponse…
                        </p>
                        <p className="mt-1 text-caption text-ink-muted">
                          Mode démonstration · réponse préenregistrée.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
        <ChatComposer
          isThinking={isThinking}
          onSubmit={(question) => {
            followMessages();
            onSubmit(question);
          }}
          onStop={onStop}
        />
        {isEmpty && (
          <ExampleLinks
            suggestions={suggestions}
            onSelect={onSelectSuggestion}
          />
        )}
        {isEmpty && <div aria-hidden className="flex-1" />}
      </div>
    </section>
  );
}
