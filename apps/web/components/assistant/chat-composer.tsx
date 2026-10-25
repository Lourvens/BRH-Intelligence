"use client";

import { ArrowUp, Square } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatComposer({ isThinking, onSubmit, onStop }: {
  isThinking: boolean;
  onSubmit: (question: string) => void;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const question = draft.trim();
    if (!question || isThinking) return;
    onSubmit(question);
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "52px";
  }

  function updateDraft(value: string) {
    setDraft(value);
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "52px";
    node.style.height = `${Math.min(node.scrollHeight, 144)}px`;
  }

  return (
    <div className="shrink-0 border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="mx-auto max-w-[880px]">
        <div className="rounded-sm border border-border bg-surface transition-colors focus-within:border-azure focus-within:ring-1 focus-within:ring-azure">
          <label htmlFor={inputId} className="block px-4 pt-3 text-caption font-semibold text-navy-ink">Votre question</label>
          <Textarea id={inputId} ref={textareaRef} value={draft} rows={1}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault(); submit();
              }
            }}
            placeholder="Interrogez les publications de la BRH…"
            className="min-h-[52px] max-h-36 resize-none rounded-none border-0 bg-transparent px-4 py-2 text-base text-ink shadow-none field-sizing-fixed focus-visible:border-transparent focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-3 px-3 pb-3">
            <span className="text-[11px] text-ink-muted"><span className="hidden sm:inline">Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne</span><span className="sm:hidden">Questions en français</span></span>
            {isThinking ? (
              <Button type="button" variant="outline" onClick={onStop} className="h-10 rounded-sm border-border text-caption shadow-none"><Square className="size-3 fill-current" aria-hidden /> Arrêter</Button>
            ) : (
              <Button type="submit" disabled={!draft.trim()} aria-label="Envoyer la question" className="size-10 rounded-sm bg-navy text-white shadow-none hover:bg-navy-deep disabled:opacity-40"><ArrowUp className="size-4" aria-hidden /></Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Les réponses peuvent contenir des erreurs. Vérifiez la page citée.</p>
      </form>
    </div>
  );
}
