import { proxyAssistantThreads } from "@/lib/assistant/server";

export const runtime = "nodejs";

export async function GET() {
  return proxyAssistantThreads("/assistant/v1/threads", { method: "GET" });
}
