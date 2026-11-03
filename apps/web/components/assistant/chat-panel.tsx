"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_LABELS,
  type AgentActivity as Activity,
} from "@/lib/chat/agent-activity";
import { feedbackTransition } from "@/lib/motion";
import { useChatScroll } from "@/lib/hooks/use-chat-scroll";
import type { ChatThread } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { ChatComposer } from "./chat-composer";
import { EmptyState } from "./empty-state";
import { Message } from "./message";
import { WorkspaceHeader } from "./workspace-header";
import { AgentActivity } from "./agent-activity";

export function ChatPanel({
  thread,
  isThinking,
  selectedCitationId,
  onSelectCitation,
  onSubmit,
  onStop,
  sourceCount,
  onOpenSources,
  activities,
  runStatus,
  isRestoring,
  isStopping,
  error,
  onRetry,
}: {
  thread: ChatThread | null;
  isThinking: boolean;
  selectedCitationId: string | null;
  onSelectCitation: (citationId: string, messageId?: string) => void;
  onSubmit: (question: string) => void;
  onStop: () => void;
  sourceCount: number;
  onOpenSources: () => void;
  activities: Activity[];
  runStatus: "idle" | "running" | "stopped" | "error";
  isRestoring: boolean;
  isStopping: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const isEmpty = !thread && !isThinking && !isRestoring;
  const threadId = thread?.id && thread.id !== "pending" ? thread.id : null;
  const currentActivity =
    activities.findLast((item) => item.status === "running") ??
    activities.at(-1);
  const announcement = isRestoring
    ? "Chargement de la conversation…"
    : isStopping
      ? "Arrêt du traitement…"
      : runStatus === "stopped"
        ? "Traitement interrompu."
        : isThinking
          ? thread?.messages.at(-1)?.streaming
            ? "L’assistant rédige sa réponse."
            : currentActivity
              ? ACTIVITY_LABELS[currentActivity.stage]
              : "Demande envoyée à l’assistant."
          : "";
  const { scrollRef, handleScroll, followMessages, isAtBottom } = useChatScroll(
    thread?.id,
    thread?.messages.length ?? 0,
    isThinking,
    reduceMotion,
    activities.length +
      activities.filter((item) => item.status !== "running").length +
      (thread?.messages.at(-1)?.streaming
        ? (thread.messages.at(-1)?.content.length ?? 0)
        : 0),
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
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </p>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          isEmpty && "overflow-y-auto overscroll-contain",
        )}
      >
        {isEmpty && <div aria-hidden className="flex-1" />}
        <AnimatePresence initial={false}>
          {isEmpty && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                duration: reduceMotion ? 0 : 0.16,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <EmptyState />
            </motion.div>
          )}
        </AnimatePresence>
        <div
          className={cn(
            "relative flex min-h-0 flex-col",
            !isEmpty && "flex-1",
          )}
        >
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
                    className="mx-auto flex max-w-[780px] flex-col gap-8"
                  >
                    {thread?.messages.map((message) => (
                      <Message
                        key={message.id}
                        message={message}
                        selectedCitationId={selectedCitationId}
                        onSelectCitation={(id) =>
                          onSelectCitation(id, message.id)
                        }
                        threadId={threadId}
                      />
                    ))}
                    {isRestoring && (
                      <p className="py-4 text-small text-ink-muted">
                        Chargement de la conversation…
                      </p>
                    )}
                    <AnimatePresence initial={false}>
                      {((isThinking && !thread?.messages.at(-1)?.streaming) ||
                        runStatus === "stopped" ||
                        runStatus === "error") && (
                        <motion.div
                          key="activity"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={
                            reduceMotion ? { duration: 0 } : feedbackTransition
                          }
                        >
                          <AgentActivity
                            activities={activities}
                            stopped={
                              runStatus === "stopped" || runStatus === "error"
                            }
                            isStopping={isStopping}
                            failed={runStatus === "error"}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {error && !isThinking ? (
                      <div
                        role="alert"
                        className="border-t border-border py-4 text-small text-ink"
                      >
                        Impossible de joindre l’assistant. Vérifiez la connexion
                        et réessayez.
                        <Button
                          type="button"
                          variant="link"
                          onClick={onRetry}
                          className="ml-2 min-h-11 text-azure"
                        >
                          Réessayer
                        </Button>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
          <AnimatePresence initial={false}>
            {!isAtBottom && !isEmpty && (
              <motion.div
                key="follow-answer"
                className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                transition={{ duration: reduceMotion ? 0 : 0.14 }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => followMessages({ smooth: true })}
                  className="pointer-events-auto rounded-full shadow-md"
                >
                  Revenir à la réponse ↓
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ChatComposer
          isThinking={isThinking}
          isRestoring={isRestoring}
          isStopping={isStopping}
          onSubmit={(question) => {
            followMessages();
            onSubmit(question);
          }}
          onStop={onStop}
        />
        {isEmpty && <div aria-hidden className="flex-1" />}
      </div>
    </section>
  );
}
