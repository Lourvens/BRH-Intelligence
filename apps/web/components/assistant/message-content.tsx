import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatCitation } from "@/lib/chat/types";

export function MessageContent({
  content,
  citations,
  onSelectCitation,
}: {
  content: string;
  citations?: ChatCitation[];
  onSelectCitation: (citationId: string) => void;
}) {
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
    p: ({ children }) => (
      <p className="text-[15px] leading-[1.72] text-ink sm:text-body sm:leading-[1.72]">
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-navy-ink">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-teal">{children}</em>
    ),
    blockquote: ({ children }) => (
      <blockquote className="rounded-r-sm border-l-2 border-gold bg-gold/10 px-3.5 py-2.5 text-[14px] italic leading-7 text-ink [&>p]:text-[14px] [&>p]:leading-7 [&>p]:text-ink">
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
    a: ({ children, href }) => {
      const marker = href?.match(/^#brh-source-(\d+)$/);
      if (marker) {
        const citation = citations?.[Number(marker[1]) - 1];
        if (!citation) return <span>{children}</span>;
        return (
          <button
            type="button"
            onClick={() => onSelectCitation(citation.id)}
            aria-label={`Voir la source ${marker[1]} : ${citation.title}, page ${citation.page}`}
            className="mx-0.5 rounded-sm bg-gold px-1 py-0.5 align-super font-mono text-caption font-bold text-navy-deep hover:underline focus-visible:outline-2 focus-visible:outline-azure"
          >
            [{marker[1]}]
          </button>
        );
      }
      return (
        <a
          href={href}
          target={href?.startsWith("http") ? "_blank" : undefined}
          rel={href?.startsWith("http") ? "noreferrer" : undefined}
          className="font-medium text-teal underline decoration-azure/40 underline-offset-2 hover:decoration-azure"
        >
          {children}
        </a>
      );
    },
    code: ({ children }) => (
      <code className="rounded bg-surface-alt px-1 py-0.5 font-mono text-[0.85em] text-navy-ink">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="overflow-x-auto rounded-sm border border-border bg-surface-alt p-3 text-caption leading-relaxed">
        {children}
      </pre>
    ),
    hr: () => <hr className="border-border" />,
    table: ({ children }) => (
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full border-collapse text-left text-caption">
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
