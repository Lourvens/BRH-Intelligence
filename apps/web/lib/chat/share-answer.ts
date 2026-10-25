import type { ChatCitation } from "./types";

export function answerWithSources(content: string, citations: readonly ChatCitation[]) {
  const sources = citations.map((citation) => `— ${citation.title}, p. ${citation.page}${citation.pdfUrl ? `\n${citation.pdfUrl}` : ""}`).join("\n");
  return sources ? `${content}\n\nSources\n${sources}` : content;
}
