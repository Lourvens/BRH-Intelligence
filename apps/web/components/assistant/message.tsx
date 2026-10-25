import { ShieldAlert } from "lucide-react";

import { uniqueCitations } from "@/lib/chat/citations";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat/types";

import { Artifact } from "./artifacts/artifact";
import { DecisionCard } from "./artifacts/decision-card";
import { MessageActions } from "./message-actions";
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
        <div className="max-w-full border-l-2 border-navy-ink bg-surface-alt px-4 py-3 text-small leading-7 text-ink sm:max-w-[85%]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
        <div
          className={cn(
            "min-w-0 py-2",
            message.refused ? "border-l-2 border-border bg-surface-alt p-4" : "bg-surface",
          )}
        >
          {message.refused ? (
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
              <div>
                <div className="mb-1 font-display text-caption font-bold text-navy-ink">
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

          <MessageActions
            content={message.content}
            citations={citations}
            selectedCitationId={selectedCitationId}
            onSelectCitation={onSelectCitation}
          />
      </div>
    </div>
  );
}
