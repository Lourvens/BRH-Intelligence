import { adminConfigured, adminSession } from "@/lib/admin/session";
import { allowLogin } from "@/lib/admin/login-limit";
import { ADMIN_SESSION_SECONDS, constantTimeEqual, credentialVersion, feedbackIdentity, sameOrigin } from "@/lib/admin/security";
import { boundedBody } from "@/lib/admin/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: { message: "Origine refusée." } }, { status: 403 });
  if (!adminConfigured()) return Response.json({ error: { message: "L’accès administrateur n’est pas configuré." } }, { status: 503 });
  const identity = feedbackIdentity(request, process.env.BRH_ADMIN_SESSION_SECRET!);
  if (!allowLogin(identity)) return Response.json({ error: { message: "Trop de tentatives. Réessayez dans 15 minutes." } }, { status: 429, headers: { "Retry-After": "900" } });
  let text: string;
  try { text = await boundedBody(request, 2048); } catch { return new Response(null, { status: 413 }); }
  let body: unknown;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  const password = typeof body === "object" && body !== null && "password" in body ? body.password : null;
  if (typeof password !== "string" || !constantTimeEqual(password, process.env.BRH_ADMIN_PASSWORD!)) {
    return Response.json({ error: { message: "Clé d’accès incorrecte." } }, { status: 401 });
  }
  const session = await adminSession();
  session.authenticated = true;
  session.expiresAt = Date.now() + ADMIN_SESSION_SECONDS * 1000;
  session.credentialVersion = credentialVersion(password);
  await session.save();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
