import { NextResponse } from "next/server";

import { proxyAssistantThreads } from "@/lib/assistant/server";

export const runtime = "nodejs";

const THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BODY_LIMIT = 4096;

type Context = { params: Promise<{ threadId: string }> };

async function threadId(context: Context): Promise<string | null> {
  const { threadId } = await context.params;
  return THREAD_ID.test(threadId) ? threadId : null;
}

export async function PUT(request: Request, context: Context) {
  const id = await threadId(context);
  if (!id) {
    return NextResponse.json(
      { error: { message: "Identifiant de conversation invalide." } },
      { status: 400 },
    );
  }
  const body = await request.text();
  if (body.length > BODY_LIMIT) {
    return NextResponse.json(
      { error: { message: "Requête trop volumineuse." } },
      { status: 413 },
    );
  }
  return proxyAssistantThreads(`/assistant/v1/threads/${id}`, {
    method: "PUT",
    body,
  });
}

export async function DELETE(_request: Request, context: Context) {
  const id = await threadId(context);
  if (!id) {
    return NextResponse.json(
      { error: { message: "Identifiant de conversation invalide." } },
      { status: 400 },
    );
  }
  return proxyAssistantThreads(`/assistant/v1/threads/${id}`, {
    method: "DELETE",
  });
}
