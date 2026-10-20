"use client";

import { Check, Copy, Link2, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ChatCitation } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type ActionState = "idle" | "done" | "fallback";

export function MessageActions({
  content,
  citations = [],
}: {
  content: string;
  citations?: readonly ChatCitation[];
}) {
  const [copied, setCopied] = useState<ActionState>("idle");
  const [shared, setShared] = useState<ActionState>("idle");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (shareTimer.current) clearTimeout(shareTimer.current);
    };
  }, []);

  function schedule(setter: (value: ActionState) => void, timer: typeof copyTimer) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setter("idle"), 2200);
  }

  async function copyAnswer() {
    const sources = citations
      .map(
        (citation) =>
          `— ${citation.title}, p. ${citation.page}${
            citation.pdfUrl ? `\n${citation.pdfUrl}` : ""
          }`,
      )
      .join("\n");

    try {
      await navigator.clipboard.writeText(
        sources ? `${content}\n\nSources\n${sources}` : content,
      );
      setCopied("done");
      schedule(setCopied, copyTimer);
    } catch {
      setCopied("idle");
    }
  }

  async function shareAnswer() {
    const url = window.location.href;
    const data = {
      title: "BRH Intelligence",
      text: content.slice(0, 280),
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
        setShared("done");
      } else {
        await navigator.clipboard.writeText(url);
        setShared("fallback");
      }
      schedule(setShared, shareTimer);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShared("idle");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copyAnswer}
        aria-label="Copier la réponse et ses sources"
        className={cn(
          "group h-7 gap-1.5 rounded-md px-2 text-[10px] font-medium text-ink-muted transition-all duration-200 hover:bg-gold/10 hover:text-navy active:scale-95",
          copied === "done" && "bg-emerald/5 text-emerald hover:text-emerald",
        )}
      >
        {copied === "done" ? (
          <Check className="size-3.5 transition-transform duration-200 scale-110" aria-hidden />
        ) : (
          <Copy className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden />
        )}
        {copied === "done" ? "Copié" : "Copier"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={shareAnswer}
        aria-label="Partager la réponse"
        className={cn(
          "group h-7 gap-1.5 rounded-md px-2 text-[10px] font-medium text-ink-muted transition-all duration-200 hover:bg-gold/10 hover:text-navy active:scale-95",
          shared !== "idle" && "bg-azure/5 text-teal hover:text-teal",
        )}
      >
        {shared === "fallback" ? (
          <Link2 className="size-3.5 transition-transform duration-200 scale-110" aria-hidden />
        ) : shared === "done" ? (
          <Check className="size-3.5 transition-transform duration-200 scale-110" aria-hidden />
        ) : (
          <Share2 className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        )}
        {shared === "fallback"
          ? "Lien copié"
          : shared === "done"
            ? "Partagé"
            : "Partager"}
      </Button>

      <span className="sr-only" aria-live="polite">
        {copied === "done" ? "Réponse copiée." : null}
        {shared === "done"
          ? "Réponse partagée."
          : shared === "fallback"
            ? "Lien copié."
            : null}
      </span>
    </div>
  );
}
