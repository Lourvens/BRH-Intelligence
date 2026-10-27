import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";

import { ThemeProvider } from "@/components/theme-provider";
import { JsonLd } from "@/components/seo/json-ld";
import {
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const montserrat = localFont({
  src: "./fonts/montserrat-latin.woff2",
  variable: "--font-montserrat",
  display: "swap",
  weight: "100 900",
});

const sourceSerif = localFont({
  src: [
    {
      path: "./fonts/source-serif-4-latin.woff2",
      weight: "200 900",
      style: "normal",
    },
    {
      path: "./fonts/source-serif-4-italic-latin.woff2",
      weight: "200 900",
      style: "italic",
    },
  ],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BRH Intelligence — Les publications de la BRH, sourcées",
    template: "%s · BRH Intelligence",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Finance",
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#070e1c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${inter.variable} ${montserrat.variable} ${sourceSerif.variable}`}
    >
      <body className="antialiased">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "Banque de la République d’Haïti",
                alternateName: "BRH",
                url: "https://www.brh.ht/",
              },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: SITE_URL,
                name: SITE_NAME,
                description: SITE_DESCRIPTION,
                inLanguage: "fr",
                publisher: { "@id": `${SITE_URL}/#organization` },
              },
            ],
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="brh-theme"
        >
          <a
            href="#contenu"
            className="sr-only rounded-full bg-navy px-4 py-2 text-small font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
          >
            Aller au contenu
          </a>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
