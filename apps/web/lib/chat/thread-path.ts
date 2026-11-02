/** Canonical URL for a LangGraph thread. */
export function threadPath(threadId: string | null): string {
  return threadId ? `/assistant/${encodeURIComponent(threadId)}` : "/assistant";
}

export function threadIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/assistant\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1]);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  } catch { return null; }
}
