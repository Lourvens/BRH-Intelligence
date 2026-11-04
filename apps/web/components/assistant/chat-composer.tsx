"use client";

import { ArrowUp, Square, Timer } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssistantVersionNotice } from "./assistant-version-notice";

export function ChatComposer({
  isThinking,
  isRestoring,
  isStopping,
  cooldownSeconds,
  cooldownLabel,
  errorPrompt,
  onSubmit,
  onStop,
}: {
  isThinking: boolean;
  isRestoring: boolean;
  isStopping: boolean;
  cooldownSeconds: number;
  cooldownLabel: string;
  errorPrompt: string | null;
  onSubmit: (question: string) => void;
  onStop: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const restoredPrompt = useRef<string | null>(null);
  const waiting = cooldownSeconds > 0;

  useEffect(() => {
    if (errorPrompt) {
      restoredPrompt.current = errorPrompt;
      setDraft((current) => current.trim() ? current : errorPrompt);
      return;
    }
    const restored = restoredPrompt.current;
    restoredPrompt.current = null;
    if (restored) setDraft((current) => current === restored ? "" : current);
  }, [errorPrompt]);

  function submit() {
    const question = draft.trim();
    if (!question || isThinking || isRestoring || waiting) return;
    onSubmit(question);
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "96px";
  }

  function updateDraft(value: string) {
    setDraft(value);
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "96px";
    node.style.height = `${Math.min(node.scrollHeight, 144)}px`;
  }

  return (
    <div className="w-full shrink-0 bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mx-auto max-w-[780px]"
      >
        <div className="rounded-2xl border border-border bg-surface-alt/60 shadow-sm transition-colors focus-within:border-azure focus-within:ring-1 focus-within:ring-azure">
          <label htmlFor={inputId} className="sr-only">
            Votre question
          </label>
          <Textarea
            id={inputId}
            ref={textareaRef}
            data-assistant-composer
            value={draft}
            rows={1}
            maxLength={4000}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Interrogez les publications de la BRH…"
            className="min-h-24 max-h-36 resize-none rounded-t-2xl border-0 bg-transparent px-4 pb-2 pt-4 text-base text-ink shadow-none field-sizing-fixed focus-visible:border-transparent focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-3 px-3 pb-3">
            <span className="text-[11px] text-ink-muted">
              <span className="hidden sm:inline">
                Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
              </span>
              <span className="sm:hidden">Questions en français</span>
            </span>
            <Button
              type={isThinking ? "button" : "submit"}
              aria-disabled={
                isStopping || isRestoring || waiting || (!isThinking && !draft.trim())
              }
              aria-label={
                isThinking
                  ? "Arrêter le traitement"
                  : waiting
                    ? `Réessayer dans ${cooldownLabel}`
                    : "Envoyer la question"
              }
              onClick={(event) => {
                if (
                  isStopping ||
                  isRestoring ||
                  waiting ||
                  (!isThinking && !draft.trim())
                ) {
                  event.preventDefault();
                  return;
                }
                if (isThinking) onStop();
              }}
              className="h-11 min-w-11 rounded-xl bg-primary px-3 text-primary-foreground shadow-none transition-colors hover:bg-primary/90 aria-disabled:opacity-40 motion-reduce:transition-none"
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={isThinking ? "stop" : waiting ? "cooldown" : "send"}
                  className="inline-flex items-center gap-2"
                  initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
                  transition={{ duration: reducedMotion ? 0 : 0.12 }}
                >
                  {isThinking ? (
                    <>
                      <Square className="size-3 fill-current" aria-hidden />
                      <span className="text-caption">
                        {isStopping ? "Arrêt…" : "Arrêter"}
                      </span>
                    </>
                  ) : waiting ? (
                    <>
                      <Timer className="size-4" aria-hidden />
                      <span className="text-caption tabular-nums">{cooldownLabel}</span>
                    </>
                  ) : (
                    <ArrowUp className="size-4" aria-hidden />
                  )}
                </motion.span>
              </AnimatePresence>
            </Button>
          </div>
        </div>
        <AssistantVersionNotice />
        {waiting && (
          <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-muted">
            Nouvelle tentative possible dans {cooldownLabel}.
          </p>
        )}
      </form>
    </div>
  );
}
