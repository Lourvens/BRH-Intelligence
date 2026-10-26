import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { figureUrl, readingSchema } from "@/lib/corpus/markdown";
import { DocumentFigure } from "./document-figure";

export function MarkdownPage({ markdown, slug, publicationId }: { markdown: string; slug: string; publicationId?: string | null }) {
  return <article className="research-reading min-w-0 font-reading text-base leading-[1.75] text-ink">
    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, readingSchema]]}
      components={{
        h1: ({ children }) => <h2 className="mb-5 mt-8 text-2xl font-bold leading-snug first:mt-0">{children}</h2>,
        h2: ({ children }) => <h2 className="mb-4 mt-7 text-xl font-semibold leading-snug first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-3 mt-6 text-lg font-semibold">{children}</h3>,
        h4: ({ children }) => <h4 className="mb-3 mt-5 font-semibold">{children}</h4>,
        p: ({ children }) => <p className="my-4">{children}</p>,
        ul: ({ children }) => <ul className="my-4 list-disc space-y-1 pl-6">{children}</ul>,
        ol: ({ children }) => <ol className="my-4 list-decimal space-y-1 pl-6">{children}</ol>,
        blockquote: ({ children }) => <blockquote className="my-5 border-l-2 border-gold pl-5 text-ink-muted">{children}</blockquote>,
        table: ({ children }) => <div className="my-6 max-w-full overflow-x-auto border border-border"><table className="w-full border-collapse text-left text-sm leading-6">{children}</table></div>,
        th: ({ children, colSpan, rowSpan }) => <th colSpan={colSpan} rowSpan={rowSpan} className="border border-border bg-surface-alt p-2.5 font-semibold">{children}</th>,
        td: ({ children, colSpan, rowSpan }) => <td colSpan={colSpan} rowSpan={rowSpan} className="border border-border p-2.5 align-top">{children}</td>,
        img: ({ src, alt }) => {
          const url = figureUrl(slug, typeof src === "string" ? src : undefined, publicationId);
          // Extracted figures are dynamic local assets, not optimized public images.
          return url ? <DocumentFigure key={url} src={url} alt={alt || "Figure extraite du document"} /> : <span className="text-sm text-ink-muted">[Figure non disponible]</span>;
        },
        a: ({ href, children }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="text-teal underline underline-offset-4">{children}</a>,
        pre: ({ children }) => <pre className="my-4 overflow-x-auto bg-surface-alt p-4 text-sm">{children}</pre>,
      }}>
      {markdown}
    </Markdown>
  </article>;
}
