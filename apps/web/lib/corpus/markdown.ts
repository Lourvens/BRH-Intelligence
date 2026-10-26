import { defaultSchema } from "rehype-sanitize";

export const readingSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    td: [...(defaultSchema.attributes?.td ?? []), "colSpan", "rowSpan"],
    th: [...(defaultSchema.attributes?.th ?? []), "colSpan", "rowSpan"],
  },
};

export function figureUrl(slug: string, source: string | undefined, publicationId?: string | null) {
  if (!source?.startsWith("assets/")) return null;
  const parts = source.slice(7).split("/");
  if (parts.some((part) => !part || part === "." || part === "..") || !/\.(png|jpe?g|webp|gif)$/i.test(source)) return null;
  const version = publicationId && /^[a-f0-9]{64}$/.test(publicationId) ? `/versions/${publicationId}` : "";
  return `/api/corpus/documents/${encodeURIComponent(slug)}${version}/assets/${parts.map(encodeURIComponent).join("/")}`;
}
