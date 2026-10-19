"use client";

/**
 * Frontend contract with the LangGraph agent (ADR-0008).
 *
 * The agent graph is deployed to LangGraph Platform and consumed with the
 * official SDK's `useStream` hook. This module is the single place the app
 * talks to it.
 */

import { useStream } from "@langchain/langgraph-sdk/react";

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
  messages: unknown[];
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
 * The real LangGraph stream. It is intentionally not used by the demo landing
 * page yet: the graph nodes are still scaffolds. This hook is the boundary the
 * chat shell will use once the server returns answers.
 */
export function useAgent(options: {
  threadId?: string | null;
  onThreadId?: (threadId: string) => void;
} = {}) {
  return useStream({
    assistantId: ASSISTANT_ID,
    apiUrl: API_URL,
    threadId: options.threadId,
    onThreadId: options.onThreadId,
    fetchStateHistory: { limit: 20 },
  });
}
