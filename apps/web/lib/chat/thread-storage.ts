import { isSameDay, isSameWeek } from "date-fns";

import type { ChatThread, ChatThreadGroup } from "./types";

/** A conversation as persisted in the browser, before messages are attached. */
export type ThreadInfo = Omit<ChatThread, "messages">;

export const STORAGE_KEY = "brh:assistant:threads:v1";

const PENDING_TITLE_MAX = 48;
const DEFAULT_TITLE = "Conversation";

export function threadGroup(date: Date, now = new Date()): ChatThreadGroup {
  if (isSameDay(date, now)) return "Aujourd’hui";
  if (isSameWeek(date, now, { weekStartsOn: 1 })) return "Cette semaine";
  return "Plus ancien";
}

/** Build the sidebar entry for a thread whose title is still being generated. */
export function createThreadInfo(
  id: string,
  title?: string | null,
  now = new Date(),
): ThreadInfo {
  return {
    id,
    title: title?.slice(0, PENDING_TITLE_MAX) || DEFAULT_TITLE,
    updatedAt: now.toISOString(),
    group: threadGroup(now, now),
  };
}

function isThreadInfo(value: unknown): value is ThreadInfo {
  if (!value || typeof value !== "object") return false;
  const thread = value as Partial<ThreadInfo>;
  return typeof thread.id === "string" && typeof thread.title === "string";
}

function normalizeTimestamp(value: unknown, now: Date): string {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  // v1 stored a hardcoded label. Give those threads a real starting point
  // instead of dropping the conversation from the sidebar.
  return now.toISOString();
}

/** Validate the persisted envelope, keeping only threads with string ids and titles. */
export function parseStoredThreads(value: unknown, now = new Date()): ThreadInfo[] {
  if (!value || typeof value !== "object" || !("threads" in value) || !("activeId" in value)) {
    return [];
  }
  const { threads } = value as { threads?: unknown };
  if (!Array.isArray(threads) || !threads.every(isThreadInfo)) return [];
  return threads.map((thread) => {
    const updated = new Date(normalizeTimestamp(thread.updatedAt, now));
    return {
      ...thread,
      updatedAt: updated.toISOString(),
      group: threadGroup(updated, now),
    };
  });
}

/** Read persisted threads; an absent or unreadable store yields no threads. */
export function readStoredThreads(
  storage: Pick<Storage, "getItem"> = sessionStorage,
): ThreadInfo[] {
  try {
    return parseStoredThreads(JSON.parse(storage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return [];
  }
}

/** Persist threads and the active id; storage may be disabled in private browsing. */
export function writeStoredThreads(
  threads: readonly ThreadInfo[],
  activeId: string | null,
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ threads, activeId }));
  } catch { /* Storage is optional; server thread state remains authoritative. */ }
}
