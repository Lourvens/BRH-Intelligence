"use client";

import { ArrowUp, Loader2, Search, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ChatThread, SuggestedQuestion } from "@/lib/chat/types";

import { EmptyState } from "./empty-state";
import { Message } from "./message";

export function ChatPanel({
  thread,
  suggestions,
  isThinking,
  selectedCitationId,
  onSelectSuggestion,
  onSelectCitation,
  onSubmit,
  onStop,
}: {
  thread: ChatThread | null;
  suggestions: readonly SuggestedQuestion[];
  isThinking: boolean;
  selectedCitationId: string | null;
  onSelectSuggestion: (threadId: string) => void;
  onSelectCitation: (citationId: string) => void;
  onSubmit: (question: string) => void;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const followRef = useRef(true);

  useEffect(() => {
    followRef.current = true;
  }, [thread?.id]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !followRef.current) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [thread?.messages.length, isThinking]);

  function handleScroll() {
    const node = scrollRef.current;
    if (!node) return;
    followRef.current =
      node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  }

  function handleSubmit() {
    const question = draft.trim();
    if (!question || isThinking) return;
    followRef.current = true;
    onSubmit(question);
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "48px";
  }

  function handleInput(value: string) {
    setDraft(value);
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "48px";
    node.style.height = `${Math.min(node.scrollHeight, 144)}px`;
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bg">
      <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
        {!thread && !isThinking ? (
          <EmptyState suggestions={suggestions} onSelect={onSelectSuggestion} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
            {thread?.messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                selectedCitationId={selectedCitationId}
                onSelectCitation={onSelectCitation}
              />
            ))}

            {isThinking ? (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-navy text-gold shadow-sm">
                  <Search className="size-4" aria-hidden />
                </div>
                <div className="rounded-2xl rounded-tl-md border border-border bg-surface p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-small font-medium text-navy">
                    <Loader2 className="size-4 animate-spin text-teal" aria-hidden />
                    Recherche dans le corpus…
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-muted">
                    Les passages, le document et la page sont vérifiés avant la
                    réponse.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm transition-colors focus-within:border-navy/30">
            <textarea
              ref={textareaRef}
              value={draft}
              rows={1}
              onChange={(event) => handleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Posez une question sur la BRH…"
              aria-label="Votre question"
              className="min-h-[48px] max-h-36 w-full resize-none bg-transparent px-3 py-2.5 text-small text-ink outline-none placeholder:text-ink-muted/70"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-0.5">
              <span className="hidden text-[10px] text-ink-muted sm:inline">
                Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
              </span>
              <span className="text-[10px] text-ink-muted sm:hidden">
                Recherche dans le corpus
              </span>

              {isThinking ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:bg-surface-alt"
                >
                  <Square className="size-3 fill-current" aria-hidden />
                  Arrêter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!draft.trim()}
                  aria-label="Envoyer la question"
                  className="grid size-9 place-items-center rounded-xl bg-navy text-white shadow-sm transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-ink-muted">
            Les réponses peuvent contenir des erreurs. Vérifiez la page citée.
          </p>
        </div>
      </div>
    </section>
  );
}
