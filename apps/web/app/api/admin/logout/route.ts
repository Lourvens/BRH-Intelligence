import { adminConfigured, adminSession } from "@/lib/admin/session";
import { sameOrigin } from "@/lib/admin/security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (adminConfigured()) (await adminSession()).destroy();
  return new Response(null, { status: 303, headers: { Location: new URL("/admin/login", request.url).href, "Cache-Control": "no-store" } });
}
