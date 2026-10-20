import { FileText, Landmark, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat/types";

import { Artifact } from "./artifacts/artifact";
import { DecisionCard } from "./artifacts/decision-card";
import { MessageContent } from "./message-content";

export function Message({
  message,
  selectedCitationId,
  onSelectCitation,
}: {
  message: ChatMessage;
  selectedCitationId: string | null;
  onSelectCitation: (citationId: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-navy px-4 py-3 text-small leading-relaxed text-white shadow-sm sm:max-w-[620px]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-navy text-gold shadow-sm">
        <Landmark className="size-4" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-navy">BRH Intelligence</span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink-muted">Assistant documentaire</span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              message.refused
                ? "border-gold/50 bg-gold/15 text-gold-ink"
                : "border-azure/25 bg-azure/5 text-teal",
            )}
          >
            {message.refused ? "Refus explicite" : "Réponse sourcée"}
          </span>
        </div>

        <div
          className={cn(
            "rounded-2xl rounded-tl-md border bg-surface p-4 shadow-sm sm:p-5",
            message.refused
              ? "border-gold/50 bg-gold/10"
              : "border-border",
          )}
        >
          {message.refused ? (
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold-ink" aria-hidden />
              <div>
                <div className="mb-1 font-display text-caption font-bold text-navy">
                  Refus explicite
                </div>
                <p className="text-small leading-relaxed text-ink">
                  {message.content}
                </p>
              </div>
            </div>
          ) : (
            <MessageContent
              content={message.content}
              citations={message.citations}
              onSelectCitation={onSelectCitation}
            />
          )}

          {message.artifacts?.length ? (
            <div className="mt-4 space-y-3">
              {message.artifacts.map((artifact) => (
                <Artifact key={artifact.id} artifact={artifact} />
              ))}
              <DecisionCard artifact={message.artifacts[0]} />
            </div>
          ) : null}

          {message.citations?.length ? (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <FileText className="size-3.5" aria-hidden />
                Sources
              </div>
              <div className="flex flex-col gap-2">
                {message.citations.map((citation, index) => {
                  const active = citation.id === selectedCitationId;

                  return (
                    <button
                      key={citation.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelectCitation(citation.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors",
                        active
                          ? "border-azure/50 bg-azure/5"
                          : "border-border bg-bg hover:border-navy/25",
                      )}
                    >
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-navy text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="line-clamp-2 min-w-0 flex-1 text-[11px] font-medium leading-snug text-navy">
                        {citation.title}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                        p.&nbsp;{citation.page}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
