import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";
import { corpusGet } from "@/lib/corpus/server";
import type { DocumentList } from "@/lib/corpus/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  let documents: MetadataRoute.Sitemap = [];
  try {
    const first = await corpusGet<DocumentList>("documents?page_size=100");
    const rest = await Promise.all(Array.from({ length: Math.ceil(first.total / 100) - 1 }, (_, index) => corpusGet<DocumentList>(`documents?page_size=100&page=${index + 2}`)));
    documents = [first, ...rest].flatMap((page) => page.items.map((document) => ({
      url: `${SITE_URL}/documents/${document.slug}`, lastModified: new Date(document.synced_at),
      changeFrequency: "monthly" as const, priority: 0.6,
    })));
  } catch { /* Core routes remain discoverable during a corpus API outage. */ }
  return [
    ...documents,
    { url: `${SITE_URL}/brh-corpus`, changeFrequency: "daily", priority: 0.9 },
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/assistant`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
