import { operationsRequest } from "@/lib/admin/server";
import { feedbackIdentity, sameOrigin } from "@/lib/admin/security";
import { boundedBody, BodyTooLargeError } from "@/lib/admin/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: { message: "Origine refusée." } }, { status: 403 });
  const secret = process.env.BRH_ADMIN_API_TOKEN;
  if (!secret || secret.length < 32) return Response.json({ error: { message: "Le service d’avis est indisponible." } }, { status: 503 });
  try {
    const body = await boundedBody(request, 32000);
    const response = await operationsRequest("feedback/v1", {
      method: "POST", body,
      headers: { "Content-Type": "application/json", "X-BRH-Feedback-Identity": feedbackIdentity(request, secret) },
    });
    if (response.status >= 500) throw new Error("Feedback unavailable");
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    if (response.headers.has("retry-after")) headers.set("Retry-After", response.headers.get("retry-after")!);
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    if (error instanceof BodyTooLargeError) return Response.json({ error: { message: "Votre avis est trop long." } }, { status: 413 });
    return Response.json({ error: { message: "Votre avis n’a pas pu être envoyé. Réessayez." } }, { status: 503 });
  }
}
