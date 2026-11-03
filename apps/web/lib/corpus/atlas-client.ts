export async function readAtlas<T>(
  url: string,
  signal: AbortSignal,
): Promise<T> {
  const r = await fetch(url, { signal });
  if (!r.ok)
    throw new Error(
      r.status === 400
        ? "Ces critères ne sont pas valides."
        : "Le graphe est temporairement indisponible.",
    );
  return r.json();
}
