import { NextResponse } from "next/server";

import { proxyAssistantThreads } from "@/lib/assistant/server";

export const runtime = "nodejs";

const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await context.params;
  if (!THREAD_ID.test(threadId)) {
    return NextResponse.json(
      { error: { message: "Identifiant de conversation invalide." } },
      { status: 400 },
    );
  }
  return proxyAssistantThreads(
    `/assistant/v1/threads/${threadId}/restore`,
    { method: "POST" },
  );
}
