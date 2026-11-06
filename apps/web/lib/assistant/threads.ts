import { threadGroup, type ThreadInfo } from "@/lib/chat/thread-storage";

export type AssistantThreadRecord = {
  thread_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

async function call(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  if (!response.ok) throw new Error(`conversation index ${response.status}`);
  return response;
}

export async function listThreads(): Promise<AssistantThreadRecord[]> {
  const response = await call("/api/assistant/threads");
  const body = (await response.json()) as { items?: AssistantThreadRecord[] };
  return Array.isArray(body.items) ? body.items : [];
}

export async function saveThread(threadId: string, title: string): Promise<void> {
  await call(`/api/assistant/threads/${encodeURIComponent(threadId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function forgetThread(threadId: string): Promise<void> {
  await call(`/api/assistant/threads/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
  });
}

/**
 * Re-attach a checkpointed conversation to the Agent Server runtime. Cheap when
 * the thread is already known; essential after a restart or a new deployment.
 */
export async function restoreThread(threadId: string): Promise<void> {
  await call(`/api/assistant/threads/${encodeURIComponent(threadId)}/restore`, {
    method: "POST",
  });
}

/** Map a stored conversation onto the sidebar model. */
export function serverThreadInfo(record: AssistantThreadRecord): ThreadInfo {
  const updated = new Date(record.updated_at);
  const date = Number.isNaN(updated.getTime()) ? new Date() : updated;
  return {
    id: record.thread_id,
    title: record.title || "Conversation",
    updatedAt: date.toISOString(),
    group: threadGroup(date),
  };
}
