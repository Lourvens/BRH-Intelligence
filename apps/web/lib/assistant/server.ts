import "server-only";

import { NextResponse } from "next/server";

export const OWNER_COOKIE = "brh-assistant-owner";
const OWNER = /^[A-Za-z0-9_-]{16,128}$/;
const TIMEOUT_MS = 8000;

/** The agent service owns the conversation index; the browser never sees its DB. */
export function assistantAgentUrl(path: string) {
  const base =
    process.env.BRH_AGENT_API_URL ??
    process.env.BRH_CORPUS_API_URL ??
    "http://127.0.0.1:2024";
  return `${base.replace(/\/$/, "")}${path}`;
}

/**
 * Anonymous browser owner. The cookie is the only identity a thread list has:
 * it keeps conversations scoped to one browser without adding accounts.
 */
export async function assistantOwner(): Promise<{
  owner: string;
  created: boolean;
}> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const existing = store.get(OWNER_COOKIE)?.value;
  if (existing && OWNER.test(existing)) return { owner: existing, created: false };
  return { owner: crypto.randomUUID(), created: true };
}

/**
 * Proxy one conversation-index call to the agent service. The owner header is
 * attached server-side, so the token never travels through page JavaScript.
 */
export async function proxyAssistantThreads(
  path: string,
  init: { method: string; body?: string },
): Promise<NextResponse> {
  const { owner, created } = await assistantOwner();
  let upstream: Response;
  try {
    upstream = await fetch(assistantAgentUrl(path), {
      method: init.method,
      body: init.body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "x-assistant-owner": owner,
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: { message: "L’historique des conversations est indisponible." } },
      { status: 503 },
    );
  }
  const payload = await upstream.text();
  const response = new NextResponse(payload, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
  if (created) {
    response.cookies.set({
      name: OWNER_COOKIE,
      value: owner,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
