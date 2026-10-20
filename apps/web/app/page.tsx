import type { Metadata } from "next";

import { AccessCta } from "@/components/home/access-cta";
import { ComparisonSection } from "@/components/home/comparison-section";
import { CorpusSection } from "@/components/home/corpus-section";
import { FaqSection } from "@/components/home/faq-section";
import { Hero } from "@/components/home/hero";
import { PipelineSection } from "@/components/home/pipeline-section";
import { UsagesSection } from "@/components/home/usages-section";
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
    absolute: "BRH Intelligence — Les publications de la BRH, sourcées",
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
    title: "BRH Intelligence — Les publications de la BRH, sourcées",
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
        <Hero />
        <PipelineSection />
        <CorpusSection />
        <UsagesSection />
        <ComparisonSection />
        <FaqSection />
        <AccessCta />
      </main>
      <SiteFooter />
    </div>
  );
}
