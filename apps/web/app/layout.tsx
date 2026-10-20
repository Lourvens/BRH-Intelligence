import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { ThemeProvider } from "@/components/theme-provider";

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

const description =
  "Posez vos questions sur les publications officielles de la Banque de la République d'Haïti. Réponses en français, avec le document et la page exacte.";

export const metadata: Metadata = {
  title: {
    default: "BRH Intelligence — Les publications de la BRH, sourcées",
    template: "%s · BRH Intelligence",
  },
  description,
  applicationName: "BRH Intelligence",
  openGraph: {
    type: "website",
    locale: "fr_HT",
    siteName: "BRH Intelligence",
    title: "BRH Intelligence",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f9fc",
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
      </body>
    </html>
  );
}
