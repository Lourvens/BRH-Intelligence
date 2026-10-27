import type { Metadata } from "next";

import { ResearchLanding } from "@/components/home/research-landing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "BRH Corpus — L’économie haïtienne, à la source",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_HT",
    url: "/",
    siteName: SITE_NAME,
    title: "BRH Corpus — L’économie haïtienne, à la source",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "BRH Intelligence",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader />
      <main id="contenu">
        <ResearchLanding />
      </main>
      <SiteFooter />
    </div>
  );
}
