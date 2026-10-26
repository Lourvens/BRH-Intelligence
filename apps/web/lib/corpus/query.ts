export function corpusLink(query: Record<string, string>, changes: Record<string, string | number | null>) {
  const next = { ...query };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") delete next[key];
    else next[key] = String(value);
  }
  return `/brh-corpus?${new URLSearchParams(next)}`;
}
