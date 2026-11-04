import "server-only";

export function operationsUrl(path: string): string {
  const base = process.env.BRH_CORPUS_API_URL ?? "http://127.0.0.1:2024";
  return `${base.replace(/\/$/, "")}/${path}`;
}

export async function operationsRequest(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env.BRH_ADMIN_API_TOKEN;
  if (!token || token.length < 32) throw new Error("Operations API unavailable");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(operationsUrl(path), { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(10000) });
}

export async function adminGet<T>(path: string): Promise<T> {
  const response = await operationsRequest(`admin/v1/${path}`);
  if (!response.ok) throw new Error("Operations API unavailable");
  return response.json() as Promise<T>;
}
