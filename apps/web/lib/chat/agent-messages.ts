import type { Message } from "@langchain/langgraph-sdk";
import type { Citation } from "@/lib/agent";
import type { ChatMessage } from "./types";

type Envelope = { version: number; validated: boolean; kind: string; citations: Citation[] };

/** Only published AI messages belong to the conversation; drafts stay private. */
export function agentMessagesToChatMessages(messages: Message[]): ChatMessage[] {
  return messages.flatMap((message, index): ChatMessage[] => {
    if (message.type !== "human" && message.type !== "ai") return [];
    const envelope = message.type === "ai"
      ? message.additional_kwargs?.brh as Envelope | undefined : undefined;
    if (message.type === "ai" && (envelope?.version !== 1 || envelope.validated !== true ||
      !Array.isArray(envelope.citations))) return [];
    const content = typeof message.content === "string" ? message.content : message.content
      .filter((block) => block.type === "text").map((block) => "text" in block ? block.text : "").join("");
    return [{ id: message.id || `message-${index}`, role: message.type === "human" ? "user" : "assistant",
      content, citations: envelope?.citations?.map((citation) => ({
        id: `${citation.document_id}:${citation.page_number}`, title: citation.title,
        page: citation.page_number, snippet: citation.snippet, source: citation.slug,
        kind: "Document", pdfUrl: citation.pdf_url,
      })) ?? [],
    }];
  });
}
