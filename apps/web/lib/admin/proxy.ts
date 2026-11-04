import "server-only";
import { isAdminSession } from "./session";
import { operationsRequest } from "./server";
import { sameOrigin } from "./security";
import { boundedBody, BodyTooLargeError } from "./request-body";

export async function proxyAdmin(request: Request, path: string) {
  if (!await isAdminSession()) return Response.json({ error: { message: "Connexion requise." } }, { status: 401 });
  if (request.method !== "GET" && !sameOrigin(request)) return Response.json({ error: { message: "Origine refusée." } }, { status: 403 });
  try {
    const body = request.method === "GET" ? undefined : await boundedBody(request, 20000);
    const response = await operationsRequest(`admin/v1/${path}`, {
      method: request.method, body, headers: { "Content-Type": "application/json" },
    });
    if (response.status >= 500) throw new Error("Upstream unavailable");
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof BodyTooLargeError) return Response.json({ error: { message: "Votre note est trop longue." } }, { status: 413 });
    return Response.json({ error: { message: "Le service est indisponible. Réessayez." } }, { status: 503 });
  }
}
