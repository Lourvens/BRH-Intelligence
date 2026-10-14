"use client";

/**
 * Frontend contract with the LangGraph agent (ADR-0008).
 *
 * The agent graph is deployed to LangGraph Platform and consumed with the
 * official SDK's `useStream` hook. This module is the single place the app
 * talks to it.
 *
 * TODO: implement `useAgent` by wrapping `useStream` from
 * `@langchain/langgraph-sdk/react`, pointed at `NEXT_PUBLIC_LANGGRAPH_URL`.
 * It returns `messages` (the conversation), `values` (graph state, incl.
 * citations), plus `submit`, `stop`, `isLoading`, `error`, and `threadId`.
 */

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

/**
 * The graph state, mirroring `brh_agent.state.AgentState`.
 * Keep this in sync with the backend.
 */
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

export function useAgent(): never {
  throw new Error("TODO: wrap useStream from @langchain/langgraph-sdk/react");
}
