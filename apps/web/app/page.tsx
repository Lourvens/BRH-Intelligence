import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";
import { SiteHeader } from "@/components/site-header";
import {
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "BRH Intelligence — L’agent d’analyse de l’économie haïtienne",
  },
  description:
    "Posez une question sur les publications de la BRH, ou explorez tout le corpus. L’agent compare les documents, construit les graphiques et cite chaque page.",
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_HT",
    url: "/",
    siteName: SITE_NAME,
    title: "BRH Intelligence — L’agent d’analyse de l’économie haïtienne",
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
      <LandingPage />
    </div>
  );
}
