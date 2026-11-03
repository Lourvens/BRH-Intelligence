/** Canonical in-app links for corpus documents, entities and graph focus. */
export function documentPageHref(slug: string, page: number): string {
  return `/documents/${slug}?page=${page}`;
}

export function entityHref(identifier: string): string {
  return `/brh-corpus/entities/${identifier}`;
}

export function graphFocusHref(kind: string, identifier: string): string {
  return `/brh-corpus/graph?focus=${kind}:${identifier}`;
}
