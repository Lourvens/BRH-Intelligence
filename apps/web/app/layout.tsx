import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

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
    <html lang="fr" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
