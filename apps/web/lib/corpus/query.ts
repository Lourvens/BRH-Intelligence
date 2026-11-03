import { FILTER_ALL } from "./filters";

export type SearchChange = string | number | null | undefined;

export function applySearchChanges(
  current: URLSearchParams | Record<string, string>,
  changes: Record<string, SearchChange>,
  options?: { dropPage?: boolean; dropBlank?: boolean },
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  if (options?.dropPage) next.delete("page");
  if (options?.dropBlank) {
    for (const [key, value] of [...next]) {
      if (isBlankFilter(value)) next.delete(key);
    }
  }
  return next;
}

export function isBlankFilter(value: string | null | undefined): boolean {
  return !value || value === FILTER_ALL;
}

export function corpusLink(query: Record<string, string>, changes: Record<string, string | number | null>) {
  const next = { ...query };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") delete next[key];
    else next[key] = String(value);
  }
  return `/brh-corpus?${new URLSearchParams(next)}`;
}
