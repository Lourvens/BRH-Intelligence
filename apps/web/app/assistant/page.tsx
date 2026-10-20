import type { Metadata } from "next";

import { AssistantShell } from "@/components/assistant/assistant-shell";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Assistant documentaire",
  description:
    "Posez une question sur les publications de la Banque de la République d’Haïti. Chaque réponse renvoie au document et à la page.",
  alternates: {
    canonical: "/assistant",
  },
  openGraph: {
    type: "website",
    locale: "fr_HT",
    url: "/assistant",
    siteName: SITE_NAME,
    title: "Assistant documentaire · BRH Intelligence",
    description:
      "Posez une question sur les publications de la Banque de la République d’Haïti. Chaque réponse renvoie au document et à la page.",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Assistant documentaire · BRH Intelligence",
    description:
      "Posez une question sur les publications de la Banque de la République d’Haïti. Chaque réponse renvoie au document et à la page.",
    images: [OG_IMAGE.url],
  },
};

export default function AssistantPage() {
  return <AssistantShell />;
}
