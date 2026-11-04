import { proxyAdmin } from "@/lib/admin/proxy";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const name of ["status", "page"]) if (params.has(name)) query.set(name, params.get(name)!);
  return proxyAdmin(request, `feedback?${query}`);
}
