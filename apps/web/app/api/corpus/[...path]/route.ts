import { corpusUrl } from "@/lib/corpus/server";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  const allowed = /^(stats|facets|search|documents|entities|documents\/[^/]+(?:\/(?:pages|reader)\/\d+|\/markdown|\/assets\/.+|\/versions\/[a-f0-9]{64}\/(?:assets\/.+|markdown))?|entities\/[^/]+(?:\/graph|\/passages)?)$/;
  if (!allowed.test(joined) || path.some((part) => part === ".." || part === ".")) {
    return Response.json({ error: { message: "Ressource introuvable." } }, { status: 404 });
  }
  try {
    const response = await fetch(corpusUrl(path.map(encodeURIComponent).join("/")) + new URL(request.url).search, {
      cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: Object.fromEntries(["if-none-match"].flatMap((key) => {
        const value = request.headers.get(key);
        return value ? [[key, value]] : [];
      })),
    });
    const headers = new Headers();
    for (const key of ["content-type", "content-range", "accept-ranges", "etag", "cache-control", "content-disposition", "x-brh-source-sha256", "x-brh-markdown-sha256", "x-brh-published-at", "x-brh-title"]) {
      const value = response.headers.get(key);
      if (value) headers.set(key, value);
    }
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return Response.json({ error: { message: "Le corpus est temporairement indisponible." } }, { status: 503 });
  }
}
