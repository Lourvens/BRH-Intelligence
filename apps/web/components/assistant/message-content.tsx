import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatCitation } from "@/lib/chat/types";

function CitationMarks({
  citations,
  onSelectCitation,
}: {
  citations: ChatCitation[];
  onSelectCitation: (citationId: string) => void;
}) {
  return (
    <span className="ml-1 inline-flex gap-0.5 align-super">
      {citations.map((citation, index) => (
        <button
          key={citation.id}
          type="button"
          onClick={() => onSelectCitation(citation.id)}
          aria-label={`Voir la source ${index + 1}`}
          className="font-mono text-[9px] font-bold text-teal hover:underline"
        >
          [{index + 1}]
        </button>
      ))}
    </span>
  );
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
  let citationInserted = false;

  const components: Components = {
    h1: ({ children }) => (
      <h2 className="mt-6 font-reading text-title font-bold leading-tight text-navy-ink first:mt-0">
        {children}
      </h2>
    ),
    h2: ({ children }) => (
      <h3 className="mt-5 font-reading text-lead font-semibold leading-snug text-navy-ink first:mt-0">
        {children}
      </h3>
    ),
    h3: ({ children }) => (
      <h4 className="mt-4 font-reading text-small font-semibold text-teal first:mt-0">
        {children}
      </h4>
    ),
    p: ({ children }) => {
      const showCitations = !citationInserted && citations?.length;
      if (showCitations) citationInserted = true;

      return (
        <p className="text-[15px] leading-[1.72] text-ink sm:text-body sm:leading-[1.72]">
          {children}
          {showCitations ? (
            <CitationMarks
              citations={citations ?? []}
              onSelectCitation={onSelectCitation}
            />
          ) : null}
        </p>
      );
    },
    strong: ({ children }) => (
      <strong className="box-decoration-clone rounded-sm bg-gold/30 px-1 py-0.5 font-semibold text-navy-ink dark:bg-gold/25">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-teal">{children}</em>
    ),
    blockquote: ({ children }) => (
      <blockquote className="rounded-r-lg border-l-2 border-gold bg-gold/10 px-3.5 py-2.5 text-[14px] italic leading-7 text-ink [&>p]:text-[14px] [&>p]:leading-7 [&>p]:text-ink">
        {children}
      </blockquote>
    ),
    ul: ({ children }) => (
      <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-[1.7] text-ink-muted marker:text-azure">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-[1.7] text-ink-muted marker:font-semibold marker:text-navy-ink">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-0.5">{children}</li>,
    a: ({ children, href }) => (
      <a
        href={href}
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noreferrer" : undefined}
        className="font-medium text-teal underline decoration-azure/40 underline-offset-2 hover:decoration-azure"
      >
        {children}
      </a>
    ),
    code: ({ children }) => (
      <code className="rounded bg-surface-alt px-1 py-0.5 font-mono text-[0.85em] text-navy-ink">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="overflow-x-auto rounded-lg border border-border bg-surface-alt p-3 text-[11px] leading-relaxed">
        {children}
      </pre>
    ),
    hr: () => <hr className="border-border" />,
    table: ({ children }) => (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-[11px]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-surface-alt text-navy-ink">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border-b border-border px-2.5 py-2 font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-border/70 px-2.5 py-2 text-ink-muted last:border-0">
        {children}
      </td>
    ),
  };

  return (
    <div className="space-y-3 font-reading">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
