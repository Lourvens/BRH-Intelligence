import { proxyAdmin } from "@/lib/admin/proxy";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 400 });
  return proxyAdmin(request, `feedback/${encodeURIComponent(id)}`);
}
