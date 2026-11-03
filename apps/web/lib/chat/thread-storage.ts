import type { ChatThread } from "./types";

/** A conversation as persisted in the browser, before messages are attached. */
export type ThreadInfo = Omit<ChatThread, "messages">;

export const STORAGE_KEY = "brh:assistant:threads:v1";

const PENDING_TITLE_MAX = 48;
const DEFAULT_TITLE = "Conversation";
const DEFAULT_UPDATED_AT = "À l’instant";
const DEFAULT_GROUP = "Aujourd’hui" as const;

/** Build the sidebar entry for a thread whose title is still being generated. */
export function createThreadInfo(id: string, title?: string | null): ThreadInfo {
  return {
    id,
    title: title?.slice(0, PENDING_TITLE_MAX) || DEFAULT_TITLE,
    updatedAt: DEFAULT_UPDATED_AT,
    group: DEFAULT_GROUP,
  };
}

function isThreadInfo(value: unknown): value is ThreadInfo {
  if (!value || typeof value !== "object") return false;
  const thread = value as Partial<ThreadInfo>;
  return typeof thread.id === "string" && typeof thread.title === "string";
}

/** Validate the persisted envelope, keeping only threads with string ids and titles. */
export function parseStoredThreads(value: unknown): ThreadInfo[] {
  if (!value || typeof value !== "object" || !("threads" in value) || !("activeId" in value)) {
    return [];
  }
  const { threads } = value as { threads?: unknown };
  if (!Array.isArray(threads) || !threads.every(isThreadInfo)) return [];
  return threads;
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
