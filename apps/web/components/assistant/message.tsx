import { ChevronDown, FileText, Landmark, ShieldAlert } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uniqueCitations } from "@/lib/chat/citations";
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
  const citations = message.citations
    ? uniqueCitations(message.citations)
    : undefined;

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
    <div className="min-w-0">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px]">
        <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-navy text-gold shadow-sm">
          <Landmark className="size-3.5" aria-hidden />
        </div>
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
              citations={citations}
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

          {citations?.length ? (
            <Collapsible className="mt-4 border-t border-border pt-3">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    <FileText className="size-3.5" aria-hidden />
                    Sources ({citations.length})
                  </span>
                  <ChevronDown
                    className="size-3.5 text-ink-muted transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea
                  className={cn(
                    "mt-2 w-full pr-2",
                    citations.length > 3 ? "h-56" : "max-h-56",
                  )}
                >
                  <div className="flex flex-col gap-2">
                    {citations.map((citation, index) => {
                      const active = citation.id === selectedCitationId;
                      const itemClass = cn(
                        "flex w-full min-w-0 items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors",
                        active
                          ? "border-azure/50 bg-azure/5"
                          : "border-border bg-bg hover:border-navy/25",
                      );

                      const content = (
                        <>
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-navy text-[10px] font-bold text-white">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-medium leading-snug text-navy">
                              {citation.title}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-ink-muted">
                              {citation.source} · p. {citation.page}
                            </span>
                            {citation.pdfUrl ? (
                              <span className="mt-1 block break-all font-mono text-[9px] leading-snug text-teal underline decoration-azure/40 underline-offset-2">
                                {citation.pdfUrl}
                              </span>
                            ) : null}
                          </span>
                        </>
                      );

                      return citation.pdfUrl ? (
                        <a
                          key={citation.id}
                          href={citation.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => onSelectCitation(citation.id)}
                          className={itemClass}
                        >
                          {content}
                        </a>
                      ) : (
                        <button
                          key={citation.id}
                          type="button"
                          onClick={() => onSelectCitation(citation.id)}
                          className={itemClass}
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
      </div>
    </div>
  );
}
