import type { ReactNode } from "react";

import type { ChatCitation } from "@/lib/chat/types";

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function MessageContent({
  content,
  citations,
  onSelectCitation,
}: {
  content: string;
  citations?: ChatCitation[];
  onSelectCitation: (citationId: string) => void;
}) {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-3 text-small leading-relaxed text-ink">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => line.trim().startsWith("- "));

        if (isList) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5 text-ink-muted">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex}>
            {renderInline(block)}
            {blockIndex === 0
              ? citations?.map((citation, index) => (
                  <button
                    key={citation.id}
                    type="button"
                    onClick={() => onSelectCitation(citation.id)}
                    aria-label={`Voir la source ${index + 1}`}
                    className="ml-1 align-super font-mono text-[9px] font-bold text-teal hover:underline"
                  >
                    [{index + 1}]
                  </button>
                ))
              : null}
          </p>
        );
      })}
    </div>
  );
}
