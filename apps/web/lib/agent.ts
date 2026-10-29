"use client";

/**
 * Frontend contract with the LangGraph agent (ADR-0008).
 *
 * The agent graph is deployed to LangGraph Platform and consumed with the
 * official SDK's `useStream` hook. This module is the single place the app
 * talks to it.
 */

import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";

import type { ChatCitation } from "@/lib/chat/types";

/** A clickable reference to a source page, produced by the agent graph. */
export type Citation = {
  document_id: string;
  slug: string;
  title: string;
  page_number: number;
  snippet: string;
  score: number;
  pdf_url: string;
  source_url?: string | null;
};

/** The graph state, mirroring `brh_agent.state.AgentState`. */
export type AgentState = {
  messages: Message[];
  phase?: string;
  kind?: string;
  question?: string;
  grounded?: boolean;
  citations?: Citation[];
  answer?: string;
};

export const API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_URL ?? "http://localhost:2024";
export const ASSISTANT_ID =
  process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID ?? "agent";

/**
 * Single stream boundary used by the assistant workspace.
 */
export function useAgent(options: {
  threadId?: string | null;
  onThreadId?: (threadId: string) => void;
  onCustomEvent?: (data: unknown) => void;
  onFinish?: () => void;
  onError?: () => void;
} = {}) {
  return useStream<AgentState>({
    assistantId: ASSISTANT_ID,
    apiUrl: API_URL,
    threadId: options.threadId,
    onThreadId: options.onThreadId,
    onCustomEvent: options.onCustomEvent,
    onFinish: options.onFinish,
    onError: options.onError,
    fetchStateHistory: { limit: 20 },
  });
}

/** Map the agent's snake_case citation contract to the chat UI type. */
export function citationToChatCitation(citation: Citation): ChatCitation {
  return {
    id: `${citation.document_id}:${citation.page_number}`,
    title: citation.title,
    page: citation.page_number,
    snippet: citation.snippet,
    source: citation.slug,
    kind: "Document",
    pdfUrl: citation.pdf_url,
  };
}
